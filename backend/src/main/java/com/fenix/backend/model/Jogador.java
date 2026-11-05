package com.fenix.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Jogador {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String nome;
	private Double notaMarcelinho;
	private Double notaCamilinho;
	private Double notaConvidado;
	private Double mediaTotal;
	private Boolean isGoleiro = false;

	public Jogador() {		
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;

	}

	public String getNome () {
		return nome;
	}

	public void setNome(String nome){
		this.nome = nome;
	}

	public Double getNotaMarcelinho(){
		return notaMarcelinho;
	}

	public void setNotaMarcelinho(Double notaMarcelinho) {
		this.notaMarcelinho = notaMarcelinho;
	}

	public Double getNotaCamilinho() {
        return notaCamilinho;
    }

    public void setNotaCamilinho(Double notaCamilinho) {
        this.notaCamilinho = notaCamilinho;
    }

    public Double getNotaConvidado() {
        return notaConvidado;
    }

    public void setNotaConvidado(Double notaConvidado) {
        this.notaConvidado = notaConvidado;
    }

    public Double getMediaTotal() {
        return mediaTotal;
    }

    public void setMediaTotal(Double mediaTotal) {
        this.mediaTotal = mediaTotal;
    }

    public Boolean getIsGoleiro() {
        return isGoleiro;
    }

    public void setIsGoleiro(Boolean isGoleiro) {
        this.isGoleiro = isGoleiro;
    }
}

