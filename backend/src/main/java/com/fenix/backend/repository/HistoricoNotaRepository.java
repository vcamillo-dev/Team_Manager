package com.fenix.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fenix.backend.model.HistoricoNota;

public interface HistoricoNotaRepository extends JpaRepository<HistoricoNota, Long> {
    // O dashboard desenha a evolução do mais antigo para o mais novo.
    List<HistoricoNota> findAllByOrderByDataRegistroAsc();

    // Essa busca pega só os registros de um jogador para mostrar o gráfico individual.
    List<HistoricoNota> findByJogadorIdOrderByDataRegistroAsc(Long jogadorId);
}
