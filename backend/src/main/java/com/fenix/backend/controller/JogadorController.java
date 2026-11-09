package com.fenix.backend.controller;

import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import com.fenix.backend.model.Jogador;
import com.fenix.backend.repository.JogadorRepository;
import com.fenix.backend.service.HistoricoNotaService;

@RestController
@RequestMapping("/api/jogadores")
public class JogadorController {
    private final JogadorRepository jogadorRepository;
    private final HistoricoNotaService historicoNotaService;

    public JogadorController(JogadorRepository jogadorRepository, HistoricoNotaService historicoNotaService) {
        this.jogadorRepository = jogadorRepository;
        this.historicoNotaService = historicoNotaService;
    }

    @GetMapping
    public List<Jogador> listarTodos() {
        // A tabela e o sorteio usam essa lista para mostrar os jogadores cadastrados.
        return jogadorRepository.findAll();
    }

    @PostMapping
    public Jogador criarJogador(@RequestBody Jogador jogador) {
        Jogador salvo = jogadorRepository.save(jogador);
        // O primeiro registro do jogador também passa a fazer parte do histórico.
        historicoNotaService.registrar(salvo);
        return salvo;
    }

    //Rota HTTP PUT criada identificado cada jogador pelo id, e cria o metodo atualizar notas
    // para devolver a nota do jogador atualizado

    @PutMapping("/{id}")
    @Transactional
    public Jogador atualizarNotas(@PathVariable Long id, @RequestBody Jogador dados) {        

        // Procuro pelo id, porque dois jogadores podem ter nomes iguais, como goleiro e linha.
        Jogador jogador = jogadorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Jogador não encontrado"));

        if (dados.getNome() != null && dados.getNome().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O nome do jogador não pode ficar vazio");
        }

        // Guardo se algo mudou antes de substituir os valores atuais.
        boolean nomeAlterado = dados.getNome() != null
                && !Objects.equals(jogador.getNome(), dados.getNome().trim());
        boolean notasAlteradas = !Objects.equals(jogador.getNotaMarcelinho(), dados.getNotaMarcelinho())
                || !Objects.equals(jogador.getNotaCamilinho(), dados.getNotaCamilinho())
                || !Objects.equals(jogador.getNotaConvidado(), dados.getNotaConvidado());

        if (dados.getNome() != null) {
            jogador.setNome(dados.getNome().trim());
        }
        jogador.setNotaMarcelinho(dados.getNotaMarcelinho());
        jogador.setNotaCamilinho(dados.getNotaCamilinho());
        jogador.setNotaConvidado(dados.getNotaConvidado());

        if (!Boolean.TRUE.equals(jogador.getIsGoleiro())) {
            // Recalculo a média só para jogador de linha; nota vazia não entra na conta.
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

        Jogador salvo = jogadorRepository.save(jogador);
        if (nomeAlterado || notasAlteradas) {
            // Registro uma nova foto das notas quando o nome ou alguma nota mudou.
            historicoNotaService.registrar(salvo);
        }
        return salvo;
    }
}
