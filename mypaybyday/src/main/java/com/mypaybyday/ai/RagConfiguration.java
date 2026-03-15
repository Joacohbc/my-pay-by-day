package com.mypaybyday.ai;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.content.retriever.EmbeddingStoreContentRetriever;
import dev.langchain4j.rag.query.Query;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;

import com.mypaybyday.entity.Category;
import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.entity.Tag;
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
import java.util.ArrayList;
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
    public ContentRetriever combinedContentRetriever(EmbeddingStore<TextSegment> store, EmbeddingModel model) {
        
        // 1. Create a semantic retriever for history
        ContentRetriever semanticRetriever = EmbeddingStoreContentRetriever.builder()
                .embeddingStore(store)
                .embeddingModel(model)
                .maxResults(5) // Retrieve the 3 most similar examples
                .minScore(0.7)
                .build();
                
        return new ContentRetriever() {
            @Override
            public List<Content> retrieve(Query query) {
                List<Content> allContent = new ArrayList<>();

                // A. Retrieve semantic information (relevant history)
                // This searches the EmbeddingStore using the user's query
                allContent.addAll(semanticRetriever.retrieve(query));

                // B. Generate the full dictionary (static context)
                StringBuilder dictionary = new StringBuilder("--- VALID ENTITY DICTIONARY ---\n");
                
                dictionary.append("Nodes: ");
                List<FinanceNode> nodes = financeNodeRepository.listAll();
                nodes.forEach(n ->
                    dictionary.append("[").append(n.id).append(": ").append(n.name).append("] ")
                );
                LOG.info("Adding Nodes: " + nodes.size());

                dictionary.append("\nAvailable Categories: ");
                List<Category> categories = categoryRepository.listAll();
                categories.forEach(c ->
                    dictionary.append("[").append(c.id).append(": ").append(c.name).append("] ")
                );
                LOG.info("Adding Categories: " + categories.size());

                dictionary.append("\nAvailable Tags: ");
                List<Tag> tags = tagRepository.listAll();
                tags.forEach(t ->
                    dictionary.append("[").append(t.id).append(": ").append(t.name).append("] ")
                );
                LOG.info("Adding Tags: " + tags.size());

                // Add the dictionary as an additional piece of content
                allContent.add(Content.from(dictionary.toString()));

                return allContent;
            }
        };
    }
}
