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
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

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

    // After the application starts, ingest the data
    public void onStart(@Observes StartupEvent ev) {
        ingestData();
    }

    @Transactional
    public void ingestData() {
        LOG.info("Starting SQLite to RAG ingestion...");
        List<TextSegment> segments = new ArrayList<>();

        ingestEntities(eventRepository.listAll(), segments);
        
        if (!segments.isEmpty()) {
            LOG.info("Embedding and storing " + segments.size() + " segments...");
            for (TextSegment segment : segments) {
                embeddingStore.add(embeddingModel.embed(segment).content(), segment);
            }
            LOG.info("Ingested " + segments.size() + " segments into the RAG system.");
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
