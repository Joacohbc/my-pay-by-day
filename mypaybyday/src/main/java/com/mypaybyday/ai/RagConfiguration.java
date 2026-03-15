package com.mypaybyday.ai;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.Query;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;

import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.TagRepository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.List;
import java.util.logging.Logger;

@ApplicationScoped
public class RagConfiguration {

    private static final Logger LOG = Logger.getLogger(RagIngestionService.class.getName());

    @ConfigProperty(name = "rag.storage.path", defaultValue = "rag-vectors.json")
    String storagePath;

    @Inject
    FinanceNodeRepository financeNodeRepository;

    @Inject
    CategoryRepository categoryRepository;

    @Inject
    TagRepository tagRepository;

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
    public ContentRetriever contentRetriever() {
        return new ContentRetriever() {
            @Override
            public List<Content> retrieve(Query query) {
                StringBuilder dictionary = new StringBuilder();

                dictionary.append("Nodes: ");
                financeNodeRepository.listAll().forEach(n -> 
                    dictionary.append("[id: ").append(n.id).append(", name: ").append(n.name).append("] ")
                );
                dictionary.append("\nCategories: ");
                categoryRepository.listAll().forEach(c -> 
                    dictionary.append("[id: ").append(c.id).append(", name: ").append(c.name).append("] ")
                );
                dictionary.append("\nTags: ");
                tagRepository.listAll().forEach(t -> 
                    dictionary.append("[id: ").append(t.id).append(", name: ").append(t.name).append("] ")
                );

                return Collections.singletonList(Content.from(dictionary.toString()));
            }
        };
    }
}
