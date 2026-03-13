package com.mypaybyday.ai;

import dev.langchain4j.rag.DefaultRetrievalAugmentor;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.function.Supplier;

@ApplicationScoped
public class FinanceRetrievalAugmentor implements Supplier<RetrievalAugmentor> {

    private final ContentRetriever contentRetriever;

    @Inject
    public FinanceRetrievalAugmentor(ContentRetriever contentRetriever) {
        this.contentRetriever = contentRetriever;
    }

    @Override
    public RetrievalAugmentor get() {
        return DefaultRetrievalAugmentor.builder()
                .contentRetriever(contentRetriever)
                .build();
    }
}
