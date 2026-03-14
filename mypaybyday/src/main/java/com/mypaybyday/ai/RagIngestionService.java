package com.mypaybyday.ai;

import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.TagRepository;
import com.mypaybyday.repository.TimePeriodRepository;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

@Singleton
public class RagIngestionService {

    private static final Logger LOG = Logger.getLogger(RagIngestionService.class.getName());

    @Inject
    EventRepository eventRepository;

    @Inject
    CategoryRepository categoryRepository;

    @Inject
    TagRepository tagRepository;

    @Inject
    FinanceNodeRepository nodeRepository;

    @Inject
    TimePeriodRepository timePeriodRepository;

    @Inject
    SubscriptionRepository subscriptionRepository;

    // The store that will be used to store the embeddings
    @Inject
    EmbeddingStore<TextSegment> embeddingStore;

    // The model that will be used to embed the text segments
    @Inject
    EmbeddingModel embeddingModel;

    @ConfigProperty(name = "rag.storage.path", defaultValue = "rag-vectors.json")
    String storagePath;

    // After the application starts, ingest the data
    public void onStart(@Observes StartupEvent ev) {
        ingestData();
    }

    @Transactional
    public void ingestData() {
        LOG.info("Starting SQLite to RAG ingestion...");
        List<TextSegment> segments = new ArrayList<>();

        ingestEntities(eventRepository.listAll(), segments);
        ingestEntities(categoryRepository.listAll(), segments);
        ingestEntities(tagRepository.listAll(), segments);
        ingestEntities(nodeRepository.listAll(), segments);
        ingestEntities(timePeriodRepository.listAll(), segments);
        ingestEntities(subscriptionRepository.listAll(), segments);

        if (!segments.isEmpty()) {
            LOG.info("Embedding and storing " + segments.size() + " segments...");
            for (TextSegment segment : segments) {
                embeddingStore.add(embeddingModel.embed(segment).content(), segment);
            }
            LOG.info("Ingested " + segments.size() + " segments into the RAG system.");

            // Persist the store to file
            if (embeddingStore instanceof InMemoryEmbeddingStore) {
                Path path = Paths.get(storagePath);
                ((InMemoryEmbeddingStore<TextSegment>) embeddingStore).serializeToFile(path);
                LOG.info("Persisted RAG embeddings to " + storagePath);
            }
        } else {
            LOG.info("No data found to ingest.");
        }
    }

    private void ingestEntities(List<? extends RagObject> entities, List<TextSegment> segments) {
        for (RagObject entity : entities) {
            segments.add(TextSegment.from(entity.toRagContent(), entity.toRagMetadata()));
        }
        if (!entities.isEmpty()) {
            LOG.info("Prepared " + entities.size() + " " + entities.get(0).getClass().getSimpleName()
                    + " for ingestion.");
        }
    }
}
