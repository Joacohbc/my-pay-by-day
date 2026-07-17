package com.mypaybyday.service.event;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

import io.quarkus.logging.Log;

@ApplicationScoped
public class EventFileResolverService {

	private final Messages messages;

	public EventFileResolverService(Messages messages) {
		this.messages = messages;
	}

	public Set<FileEntity> resolveFiles(List<Long> fileIds) throws BusinessException {
		if (fileIds == null || fileIds.isEmpty()) {
			return new HashSet<>();
		}

		Set<FileEntity> resolvedFiles = new HashSet<>();
		for (Long fileId : fileIds) {
			FileEntity file = FileEntity.findById(fileId);
			if (file == null) {
				Log.warnf("Event references missing file id=%d", fileId);
				throw new BusinessException(messages.get(MsgKey.FILE_NOT_FOUND));
			}
			resolvedFiles.add(file);
		}
		return resolvedFiles;
	}
}
