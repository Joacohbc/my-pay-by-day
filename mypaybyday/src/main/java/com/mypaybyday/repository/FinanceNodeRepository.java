package com.mypaybyday.repository;

import java.util.List;

import com.mypaybyday.entity.FinanceNode;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class FinanceNodeRepository implements PanacheRepository<FinanceNode> {
    
    public List<FinanceNode> list(List<Long> ids) {
        return list("id in ?1", ids);
    }
}
