package com.mypaybyday.ai;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;

import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.content.retriever.EmbeddingStoreContentRetriever;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.logging.Logger;

@ApplicationScoped
public class RagConfiguration {

    private static final Logger LOG = Logger.getLogger(RagIngestionService.class.getName());

    @ConfigProperty(name = "rag.storage.path", defaultValue = "rag-vectors.json")
    String storagePath;

    @Produces
    @ApplicationScoped
    public EmbeddingStore<TextSegment> embeddingStore() {
        Path path = Paths.get(storagePath);
        if (Files.exists(path) && Files.isRegularFile(path)) {
            try {
                if (Files.size(path) > 0) {
                    return InMemoryEmbeddingStore.fromFile(path);
                }
            } catch (Exception e) {
                LOG.warning("Error loading RAG embeddings from file (it might be corrupted): " + e.getMessage());
            }
        }
        return new InMemoryEmbeddingStore<>();
    }

    @Produces
    @ApplicationScoped
    public ContentRetriever contentRetriever(EmbeddingStore<TextSegment> store, EmbeddingModel model) {
        return EmbeddingStoreContentRetriever.builder()
                .embeddingStore(store)
                .embeddingModel(model)
                .maxResults(3)
                .minScore(0.6)
                .build();
    }

}
