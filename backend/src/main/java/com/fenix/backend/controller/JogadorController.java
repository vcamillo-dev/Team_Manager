package com.fenix.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

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

    //Rota HTTP PUT criada identificado cada jogador pelo id, e cria o metodo atualizar notas
    // para devolver a nota do jogador atualizado

    @PutMapping("/{id}")
    public Jogador atualizarNotas(@PathVariable Long id, @RequestBody Jogador dados) {        

    //procura o jogador pelo id, se enontrar guarda o registro em jogador e não encontrar
    //lança o erro 404 com a mensagem jogador não encontrado
        Jogador jogador = jogadorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Jogador não encontrado"));

        jogador.setNotaMarcelinho(dados.getNotaMarcelinho());
        jogador.setNotaCamilinho(dados.getNotaCamilinho());
        jogador.setNotaConvidado(dados.getNotaConvidado());

        if (!Boolean.TRUE.equals(jogador.getIsGoleiro())) {
            Double[] notas = {
                    jogador.getNotaMarcelinho(),
                    jogador.getNotaCamilinho(),
                    jogador.getNotaConvidado()
            };

            double soma = 0;
            int quantidade = 0;

            for (Double nota : notas) {
                if (nota != null) {
                    soma += nota;
                    quantidade++;
                }
            }

            jogador.setMediaTotal(quantidade == 0 ? null : soma / quantidade);
        }

        return jogadorRepository.save(jogador);
    }
}
