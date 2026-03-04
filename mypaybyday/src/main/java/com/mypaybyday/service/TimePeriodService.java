package com.mypaybyday.service;

import com.mypaybyday.entity.TimePeriod;
import com.mypaybyday.exception.BusinessException;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class TimePeriodService {

    public List<TimePeriod> listAll() throws BusinessException {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    public TimePeriod findById(Long id) throws BusinessException {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    public TimePeriod create(TimePeriod timePeriod) throws BusinessException {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    public TimePeriod update(Long id, TimePeriod timePeriodDetails) throws BusinessException {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    public void delete(Long id) throws BusinessException {
        throw new UnsupportedOperationException("Not implemented yet");
    }
}
