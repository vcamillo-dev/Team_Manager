package com.fenix.backend.service;

import java.time.Instant;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fenix.backend.model.HistoricoNota;
import com.fenix.backend.model.Jogador;
import com.fenix.backend.repository.HistoricoNotaRepository;
import com.fenix.backend.repository.JogadorRepository;

@Service
public class HistoricoNotaService implements ApplicationRunner {
    private final HistoricoNotaRepository historicoRepository;
    private final JogadorRepository jogadorRepository;

    public HistoricoNotaService(HistoricoNotaRepository historicoRepository, JogadorRepository jogadorRepository) {
        this.historicoRepository = historicoRepository;
        this.jogadorRepository = jogadorRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Na primeira inicialização, salvo as notas atuais como ponto de partida do histórico.
        if (historicoRepository.count() == 0) {
            Instant pontoDePartida = Instant.now();
            List<HistoricoNota> registrosIniciais = jogadorRepository.findAll().stream()
                    .map(jogador -> new HistoricoNota(jogador, pontoDePartida))
                    .toList();
            historicoRepository.saveAll(registrosIniciais);
        }
    }

    @Transactional
    public void registrar(Jogador jogador) {
        // Cada alteração salva vira um registro novo; não apago as notas anteriores.
        historicoRepository.save(new HistoricoNota(jogador, Instant.now()));
    }

    @Transactional(readOnly = true)
    public List<HistoricoNota> listarTodos() {
        // O dashboard precisa dos registros na ordem em que aconteceram.
        return historicoRepository.findAllByOrderByDataRegistroAsc();
    }

    @Transactional(readOnly = true)
    public List<HistoricoNota> listarPorJogador(Long jogadorId) {
        return historicoRepository.findByJogadorIdOrderByDataRegistroAsc(jogadorId);
    }
}
