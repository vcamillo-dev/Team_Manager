package com.fenix.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fenix.backend.model.Jogador;
import com.fenix.backend.repository.JogadorRepository;

@RestController
@RequestMapping("/api/jogadores")
public class JogadorController {
    private final JogadorRepository jogadorRepository;

    public JogadorController(JogadorRepository jogadorRepository) {
        this.jogadorRepository = jogadorRepository;
    }

    @GetMapping
    public List<Jogador> listarTodos() {
        return jogadorRepository.findAll();
    }

    @PostMapping
    public Jogador criarJogador(@RequestBody Jogador jogador) {
        return jogadorRepository.save(jogador);
    }
}
