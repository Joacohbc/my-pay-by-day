package com.mypaybyday.ai;

import dev.langchain4j.data.document.Metadata;

/*
 * This interface is used to convert the entities to RAG objects
 * A entity that should be converted to RAG object should implement this interface.
 * The toRagContent() method is used to convert the entity to String logical English
 * sentence to be embedded.
 *
 * The toRagMetadata() method is used to convert the entity to a metadata.
 */
public interface RagObject {
    String toRagContent();

    Metadata toRagMetadata();
}
