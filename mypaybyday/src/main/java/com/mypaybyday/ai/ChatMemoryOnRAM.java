package com.mypaybyday.ai;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

import jakarta.enterprise.context.ApplicationScoped;

import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.ChatMemoryProvider;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import org.jboss.logging.Logger;

/**
 * Provides ChatMemory for AI Services using @MemoryId.
 * Currently uses an in-memory storage.
 * For full persistence across restarts, a ChatMemoryStore could be used.
 */
@ApplicationScoped
public class ChatMemoryOnRAM implements Supplier<ChatMemoryProvider> {

	private static final Logger log = Logger.getLogger(ChatMemoryOnRAM.class);
	private final Map<Object, ChatMemory> memoryMap = new ConcurrentHashMap<>();

	public ChatMemoryProvider chatMemoryProvider() {
		return chatId -> memoryMap.computeIfAbsent(chatId, id ->
				MessageWindowChatMemory.builder()
						.maxMessages(20)
						.id(id)
						.build()
		);
	}

	@Override
	public ChatMemoryProvider get() {
		return chatMemoryProvider();
	}

	/**
	* Clears the memory for a specific chat ID.
	* @param chatId The ID to clear.
	*/
	public void clear(String chatId) {
		log.infof("Clearing memory for chatId: %s", chatId);
		memoryMap.remove(chatId);
	}

	/**
	* Trims the memory from the last UserMessage containing the specified text.
	* The matching message and all subsequent messages are removed.
	*/
	public void trimFromMessageContent(String chatId, String textToMatch) {
		ChatMemory memory = memoryMap.get(chatId);
		if (memory == null) return;

		java.util.List<dev.langchain4j.data.message.ChatMessage> messages = memory.messages();
		int truncateIndex = -1;

		// Find the last UserMessage that contains this text
		for (int i = messages.size() - 1; i >= 0; i--) {
			dev.langchain4j.data.message.ChatMessage msg = messages.get(i);
			if (msg instanceof dev.langchain4j.data.message.UserMessage userMsg) {
				String userText = "";
				if (userMsg.contents() != null) {
					for (dev.langchain4j.data.message.Content c : userMsg.contents()) {
						if (c instanceof dev.langchain4j.data.message.TextContent tc) {
							userText += tc.text();
						}
					}
				}
				if (userText.contains(textToMatch)) {
					truncateIndex = i;
					break;
				}
			}
		}

		if (truncateIndex != -1) {
			log.infof("Truncating memory for chatId: %s from index: %d", chatId, truncateIndex);
			java.util.List<dev.langchain4j.data.message.ChatMessage> keptMessages = new java.util.ArrayList<>(messages.subList(0, truncateIndex));
			memory.clear();
			for (dev.langchain4j.data.message.ChatMessage m : keptMessages) {
				memory.add(m);
			}
		}
	}
}
