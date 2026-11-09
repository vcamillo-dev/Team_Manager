package com.fenix.backend.model;

import java.time.Instant;

import jakarta.persistence.Entity;
import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(indexes = @Index(name = "idx_historico_jogador_data", columnList = "jogador_id, data_registro"))
public class HistoricoNota {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "jogador_id", nullable = false)
    private Long jogadorId;
    private String nomeJogador;
    private Double notaMarcelinho;
    private Double notaCamilinho;
    private Double notaConvidado;
    private Double mediaTotal;
    @Column(name = "data_registro", nullable = false)
    private Instant dataRegistro;

    public HistoricoNota() {
    }

    // Copio os valores atuais para uma linha nova e guardo a data dessa atualização.
    public HistoricoNota(Jogador jogador, Instant dataRegistro) {
        this.jogadorId = jogador.getId();
        this.nomeJogador = jogador.getNome();
        this.notaMarcelinho = jogador.getNotaMarcelinho();
        this.notaCamilinho = jogador.getNotaCamilinho();
        this.notaConvidado = jogador.getNotaConvidado();
        this.mediaTotal = jogador.getIsGoleiro() ? null : jogador.getMediaTotal();
        this.dataRegistro = dataRegistro;
    }

    public Long getId() { return id; }
    public Long getJogadorId() { return jogadorId; }
    public String getNomeJogador() { return nomeJogador; }
    public Double getNotaMarcelinho() { return notaMarcelinho; }
    public Double getNotaCamilinho() { return notaCamilinho; }
    public Double getNotaConvidado() { return notaConvidado; }
    public Double getMediaTotal() { return mediaTotal; }
    public Instant getDataRegistro() { return dataRegistro; }
}
