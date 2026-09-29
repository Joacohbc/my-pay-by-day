package com.mypaybyday.service.currency;

import java.time.LocalDateTime;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.entity.SystemJobEntity;
import com.mypaybyday.enums.JobCategory;
import com.mypaybyday.enums.JobStatus;
import com.mypaybyday.repository.CurrencyRepository;
import com.mypaybyday.repository.SystemJobRepository;
import io.quarkus.logging.Log;

/**
 * Queues the background conversion of past transactions into a principal currency.
 *
 * <p>Converting the whole history can touch every transaction, so it never runs inside the request
 * that made it necessary; the scheduler picks the queued job up and works through it in batches.
 * At most one job per currency is pending, and a job only fills the rates that are missing, so
 * queueing the same currency twice is harmless.
 */
@ApplicationScoped
public class ConversionBackfillQueue {

	private final SystemJobRepository systemJobRepository;
	private final CurrencyRepository currencyRepository;

	public ConversionBackfillQueue(SystemJobRepository systemJobRepository, CurrencyRepository currencyRepository) {
		this.systemJobRepository = systemJobRepository;
		this.currencyRepository = currencyRepository;
	}

	@Transactional
	public void enqueue(String currency) {
		if (isPending(currency)) return;

		SystemJobEntity job = new SystemJobEntity();
		job.jobCategory = JobCategory.CURRENCY_CONVERSION_BACKFILL;
		job.status = JobStatus.PENDING;
		job.nextExecutionDate = LocalDateTime.now();
		job.entityId = currency;
		systemJobRepository.persist(job);
		Log.infof("Queued conversion backfill into %s", currency);
	}

	/**
	 * Queues every principal currency. Used after a new quote arrives, since transactions that could
	 * not be converted for lack of one may now be convertible.
	 */
	@Transactional
	public void enqueueAllPrincipal() {
		currencyRepository.listPrincipalCodes().forEach(this::enqueue);
	}

	@Transactional
	public boolean isPending(String currency) {
		return systemJobRepository.findPendingJobByEntityId(JobCategory.CURRENCY_CONVERSION_BACKFILL, currency) != null;
	}
}
