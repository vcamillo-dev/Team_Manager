package com.fenix.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fenix.backend.model.HistoricoNota;
import com.fenix.backend.service.HistoricoNotaService;

@RestController
@RequestMapping("/api/historico-notas")
public class HistoricoNotaController {
    private final HistoricoNotaService historicoNotaService;

    public HistoricoNotaController(HistoricoNotaService historicoNotaService) {
        this.historicoNotaService = historicoNotaService;
    }

    @GetMapping
    public List<HistoricoNota> listarTodos() {
        // Usado pela aba Principal para calcular as mudanças de todos os jogadores.
        return historicoNotaService.listarTodos();
    }

    @GetMapping("/jogador/{id}")
    public List<HistoricoNota> listarPorJogador(@PathVariable Long id) {
        // Usado quando o dashboard precisa do histórico de uma pessoa só.
        return historicoNotaService.listarPorJogador(id);
    }
}
