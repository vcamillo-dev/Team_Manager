import { useEffect, useState } from 'react'
import { atualizarNotas, listarJogadores } from '../services/jogadoresApi'
import '../App.css'

const camposDasNotas = [
  'notaMarcelinho',
  'notaCamilinho',
  'notaConvidado',
]

function calcularMedia(jogador) {
  const notas = camposDasNotas
    .map((campo) => jogador[campo])
    .filter((nota) => nota !== null && nota !== undefined)

  if (notas.length === 0) return null

  return notas.reduce((soma, nota) => soma + nota, 0) / notas.length
}

function notasSaoIguais(jogadorA, jogadorB) {
  return camposDasNotas.every(
    (campo) => jogadorA[campo] === jogadorB[campo]
  )
}

function normalizarNome(nome) {
  return nome
    .replace(/\(([^)]*)\)/g, (_, conteudo) => {
      const funcao = conteudo.trim().toLocaleLowerCase('pt-BR')
      return funcao === 'goleiro' || funcao === 'linha' ? ` ${funcao} ` : ' '
    })
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR')
}

// Cadastre aqui variações conhecidas: nome colado -> nome usado no cadastro.
const aliasesJogadores = {
  [normalizarNome('Leônidas Germano')]: 'Leônidas',
  [normalizarNome('Camillo')]: 'Camilinho',
  [normalizarNome('Eduardo Sabino')]: 'Dudu Sabino',
  [normalizarNome('Turra')]: 'Pedro Turra',
  [normalizarNome('Felipe Fifi')]: 'Fifi',
  [normalizarNome('Julio César')]: 'Julio (LINHA)',
  [normalizarNome('Julio César (LINHA)')]: 'Julio (LINHA)',
  [normalizarNome('Julio César (GOLEIRO)')]: 'Julio (GOLEIRO)',
}

function resolverJogadorPorNome(nome, jogadores) {
  const nomeNormalizado = normalizarNome(nome)
  const nomeCanonico = aliasesJogadores[nomeNormalizado]

  if (nomeCanonico) {
    const candidatos = jogadores.filter(
      (jogador) => normalizarNome(jogador.nome) === normalizarNome(nomeCanonico)
    )

    if (candidatos.length === 1) {
      return { jogador: candidatos[0], status: 'encontrado', candidatos }
    }
    if (candidatos.length > 1) {
      return { jogador: null, status: 'ambiguo', candidatos }
    }
    return { jogador: null, status: 'nao-encontrado', candidatos: [] }
  }

  const correspondenciasExatas = jogadores.filter(
    (jogador) => normalizarNome(jogador.nome) === nomeNormalizado
  )

  // Nome de uma palavra que também inicia outros nomes precisa ser confirmado
  // por um alias, para não escolher o Gabriel errado, por exemplo.
  const correspondenciasPeloPrimeiroNome = nomeNormalizado.includes(' ')
    ? []
    : jogadores.filter(
        (jogador) => normalizarNome(jogador.nome).split(' ')[0] === nomeNormalizado
      )

  const candidatos = correspondenciasPeloPrimeiroNome.length > 1
    ? correspondenciasPeloPrimeiroNome
    : correspondenciasExatas

  if (candidatos.length === 1) {
    return { jogador: candidatos[0], status: 'encontrado', candidatos }
  }

  if (candidatos.length > 1) {
    return { jogador: null, status: 'ambiguo', candidatos }
  }

  return { jogador: null, status: 'nao-encontrado', candidatos: [] }
}

function limparNomeColado(linha) {
  return linha
    .split('\t')[0]
    .replace(/^\s*\d+\s*(?:[-.)]\s*|\s+)/, '')
    .replace(/\(([^)]*)\)/g, (_, conteudo) => {
      const funcao = conteudo.trim().toLocaleLowerCase('pt-BR')
      return funcao === 'goleiro' || funcao === 'linha' ? ` ${funcao} ` : ' '
    })
    .replace(/✅|✔️?|✓|☑️?|☒️?|\[[xX]\]|\([xX]\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function encontrarDivisaoMaisEquilibrada(jogadoresLinha) {
  const quantidade = jogadoresLinha.length
  const medias = jogadoresLinha.map(calcularMedia)
  const gruposPorPrimeiroIndice = Array.from(
    { length: quantidade },
    () => []
  )

  // Pré-calcula todas as combinações de quatro jogadores.
  for (let a = 0; a < quantidade - 3; a++) {
    for (let b = a + 1; b < quantidade - 2; b++) {
      for (let c = b + 1; c < quantidade - 1; c++) {
        for (let d = c + 1; d < quantidade; d++) {
          const mascara = (1 << a) | (1 << b) | (1 << c) | (1 << d)
          const soma = medias[a] + medias[b] + medias[c] + medias[d]
          gruposPorPrimeiroIndice[a].push({ mascara, soma })
        }
      }
    }
  }

  // Guarda a soma das médias para cada conjunto possível de jogadores.
  const limite = 1 << quantidade
  const somaPorMascara = new Float64Array(limite)
  for (let mascara = 1; mascara < limite; mascara++) {
    const bit = mascara & -mascara
    const indice = Math.log2(bit)
    somaPorMascara[mascara] =
      somaPorMascara[mascara ^ bit] + medias[indice]
  }

  let melhorDiferenca = Infinity
  let melhorVariancia = Infinity
  let melhoresMascaras = []
  const mascarasDosTimes = []
  const somasDosTimes = []

  function avaliarUltimoTime(mascaraRestante) {
    const somas = [...somasDosTimes, somaPorMascara[mascaraRestante]]
    const maiorSoma = Math.max(...somas)
    const menorSoma = Math.min(...somas)
    const diferenca = maiorSoma - menorSoma
    const mediaGeral = somas.reduce((total, soma) => total + soma, 0) / 4
    const variancia = somas.reduce(
      (total, soma) => total + (soma - mediaGeral) ** 2,
      0
    )

    if (
      diferenca < melhorDiferenca - 1e-10 ||
      (Math.abs(diferenca - melhorDiferenca) <= 1e-10 &&
        variancia < melhorVariancia)
    ) {
      melhorDiferenca = diferenca
      melhorVariancia = variancia
      melhoresMascaras = [...mascarasDosTimes, mascaraRestante]
    }
  }

  function buscarDivisao(mascaraRestante) {
    if (mascarasDosTimes.length === 3) {
      avaliarUltimoTime(mascaraRestante)
      return
    }

    const primeiroBit = mascaraRestante & -mascaraRestante
    const primeiroIndice = Math.log2(primeiroBit)

    for (const grupo of gruposPorPrimeiroIndice[primeiroIndice]) {
      if ((mascaraRestante & grupo.mascara) !== grupo.mascara) continue

      mascarasDosTimes.push(grupo.mascara)
      somasDosTimes.push(grupo.soma)
      buscarDivisao(mascaraRestante ^ grupo.mascara)
      mascarasDosTimes.pop()
      somasDosTimes.pop()
    }
  }

  buscarDivisao(limite - 1)

  return melhoresMascaras
    .map((mascara) => {
      const jogadores = jogadoresLinha.filter(
        (_, indice) => mascara & (1 << indice)
      )
      return {
        jogadores,
        media: somaPorMascara[mascara] / 4,
      }
    })
    .sort((timeA, timeB) => timeB.media - timeA.media)
}

function TabelaJogadores() {
  const [jogadores, setJogadores] = useState([])
  const [jogadoresOriginais, setJogadoresOriginais] = useState([])
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [ordenarPor, setOrdenarPor] = useState('nome')
  const [ordem, setOrdem] = useState('asc')
  const [textoListaAtual, setTextoListaAtual] = useState('')
  const [timesGerados, setTimesGerados] = useState([])
  const [erroTimes, setErroTimes] = useState('')

  useEffect(() => {
    listarJogadores()
      .then((resposta) => {
        setJogadores(resposta.data)
        setJogadoresOriginais(resposta.data)
      })
      .catch(() => setErro('Não foi possível carregar os jogadores.'))
  }, [])

  const temAlteracoes = jogadores.some((jogador) => {
    const original = jogadoresOriginais.find(
      (item) => item.id === jogador.id
    )

    return original && !notasSaoIguais(jogador, original)
  })

  function alternarOrdenacao(campo) {
    if (ordenarPor === campo) {
      setOrdem((ordemAtual) =>
        ordemAtual === 'asc' ? 'desc' : 'asc'
      )
    } else {
      setOrdenarPor(campo)
      // Nome começa de A a Z; média começa da maior para a menor.
      setOrdem(campo === 'nome' ? 'asc' : 'desc')
    }
  }

  const jogadoresOrdenados = [...jogadores].sort((jogadorA, jogadorB) => {
    if (ordenarPor === 'nome') {
      const comparacao = jogadorA.nome.localeCompare(
        jogadorB.nome,
        'pt-BR'
      )

      return ordem === 'asc' ? comparacao : -comparacao
    }

    // Goleiros ficam no fim quando a lista é ordenada pela média.
    if (jogadorA.isGoleiro !== jogadorB.isGoleiro) {
      return jogadorA.isGoleiro ? 1 : -1
    }

    const mediaA = calcularMedia(jogadorA)
    const mediaB = calcularMedia(jogadorB)

    if (mediaA === null && mediaB !== null) return 1
    if (mediaB === null && mediaA !== null) return -1
    if (mediaA === null && mediaB === null) return 0

    const comparacao = mediaA - mediaB
    return ordem === 'asc' ? comparacao : -comparacao
  })

  const nomesColados = textoListaAtual
    .split(/\r?\n/)
    .map(limparNomeColado)
    .filter(Boolean)

  const jogadoresDaLista = nomesColados.map((nome) => ({
    nome,
    ...resolverJogadorPorNome(nome, jogadores),
  }))

  const idsNaLista = new Set(
    jogadoresDaLista
      .filter((item) => item.jogador)
      .map((item) => item.jogador.id)
  )

  function alterarNota(id, campo, valor) {
    setJogadores((listaAtual) =>
      listaAtual.map((jogador) =>
        jogador.id === id
          ? { ...jogador, [campo]: valor === '' ? null : Number(valor) }
          : jogador
      )
    )

    setMensagem('')
    setErro('')
    setTimesGerados([])
  }

  function tirarTimes() {
    setTimesGerados([])
    setErroTimes('')

    const desconhecidos = jogadoresDaLista
      .filter((item) => item.status === 'nao-encontrado')
      .map((item) => item.nome)
    const ambiguos = jogadoresDaLista.filter(
      (item) => item.status === 'ambiguo'
    )
    const jogadoresLinha = jogadoresDaLista
      .filter((item) => item.jogador && !item.jogador.isGoleiro)
      .map((item) => item.jogador)
    const goleirosNaLista = jogadoresDaLista.filter(
      (item) => item.jogador?.isGoleiro
    )
    const contagemPorId = new Map()

    for (const jogador of jogadoresLinha) {
      contagemPorId.set(
        jogador.id,
        (contagemPorId.get(jogador.id) ?? 0) + 1
      )
    }

    const duplicados = jogadoresLinha
      .filter((jogador) => contagemPorId.get(jogador.id) > 1)
      .map((jogador) => jogador.nome)
    const semMedia = jogadoresLinha
      .filter((jogador) => calcularMedia(jogador) === null)
      .map((jogador) => jogador.nome)
    const problemas = []

    if (desconhecidos.length > 0) {
      problemas.push(`Nomes não encontrados: ${[...new Set(desconhecidos)].join(', ')}.`)
    }
    if (ambiguos.length > 0) {
      const detalhes = ambiguos.map((item) =>
        `${item.nome} (${item.candidatos.map((jogador) => jogador.nome).join(' / ')})`
      )
      problemas.push(`Nomes ambíguos; cadastre um alias específico: ${detalhes.join('; ')}.`)
    }
    if (duplicados.length > 0) {
      problemas.push(`Nomes repetidos: ${[...new Set(duplicados)].join(', ')}.`)
    }
    if (semMedia.length > 0) {
      problemas.push(`Sem média: ${[...new Set(semMedia)].join(', ')}.`)
    }
    if (jogadoresLinha.length !== 16) {
      problemas.push(
        `São necessários 16 jogadores de linha; encontrei ${jogadoresLinha.length}. Goleiros não contam para esse total.`
      )
    }

    if (problemas.length > 0) {
      setErroTimes(problemas.join(' '))
      return
    }

    setTimesGerados(encontrarDivisaoMaisEquilibrada(jogadoresLinha))
    if (goleirosNaLista.length > 0) {
      setMensagem(
        `${goleirosNaLista.length} goleiro(s) ficaram fora dos times e do cálculo de equilíbrio.`
      )
    } else {
      setMensagem('Times montados com 16 jogadores de linha; goleiros ficam fora do sorteio.')
    }
  }

  async function salvarAlteracoes() {
    const jogadoresAlterados = jogadores.filter((jogador) => {
      const original = jogadoresOriginais.find(
        (item) => item.id === jogador.id
      )

      return original && !notasSaoIguais(jogador, original)
    })

    if (jogadoresAlterados.length === 0) {
      setMensagem('Não há alterações para salvar.')
      return
    }

    setSalvando(true)
    setErro('')
    setMensagem('')

    const resultados = await Promise.allSettled(
      jogadoresAlterados.map((jogador) =>
        atualizarNotas(jogador.id, {
          notaMarcelinho: jogador.notaMarcelinho,
          notaCamilinho: jogador.notaCamilinho,
          notaConvidado: jogador.notaConvidado,
        })
      )
    )

    const jogadoresSalvos = resultados
      .filter((resultado) => resultado.status === 'fulfilled')
      .map((resultado) => resultado.value.data)

    if (jogadoresSalvos.length > 0) {
      setJogadores((listaAtual) =>
        listaAtual.map(
          (jogador) =>
            jogadoresSalvos.find((salvo) => salvo.id === jogador.id) ??
            jogador
        )
      )

      setJogadoresOriginais((listaAtual) =>
        listaAtual.map(
          (jogador) =>
            jogadoresSalvos.find((salvo) => salvo.id === jogador.id) ??
            jogador
        )
      )
    }

    const quantidadeComErro = resultados.length - jogadoresSalvos.length

    if (quantidadeComErro === 0) {
      setMensagem('Todas as alterações foram salvas.')
    } else {
      setErro(
        `${jogadoresSalvos.length} jogador(es) salvo(s); ${quantidadeComErro} não puderam ser salvos.`
      )
    }

    setSalvando(false)
  }

  return (
    <div className="painel-administracao">
      <div className="acoes-administracao">
        <button
          onClick={salvarAlteracoes}
          disabled={salvando || !temAlteracoes}
        >
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>

      <section className="painel-notas">
        {erro && <p>{erro}</p>}
        {mensagem && <p>{mensagem}</p>}

        <div className="tabela-scroll">
          <table className="tabela-jogadores">
            <thead>
              <tr>
                <th>
                  <button onClick={() => alternarOrdenacao('nome')}>
                    Nome {ordenarPor === 'nome' ? (ordem === 'asc' ? '↑' : '↓') : '↕'}
                  </button>
                </th>
                <th>
                  <button onClick={() => alternarOrdenacao('media')}>
                    Média {ordenarPor === 'media' ? (ordem === 'asc' ? '↑' : '↓') : '↕'}
                  </button>
                </th>
                <th>Nota de Marcelinho</th>
                <th>Nota de Camillo</th>
                <th>Nota do convidado</th>
                <th>Goleiro</th>
              </tr>
            </thead>

            <tbody>
              {jogadoresOrdenados.map((jogador) => {
                const media = jogador.isGoleiro
                  ? null
                  : calcularMedia(jogador)

                return (
                  <tr
                    key={jogador.id}
                    className={idsNaLista.has(jogador.id) ? 'jogador-na-lista' : undefined}
                  >
                    <td>{jogador.nome}</td>
                    <td>{media === null ? '—' : media.toFixed(2)}</td>

                    {camposDasNotas.map((campo) => (
                      <td key={campo}>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.01"
                          value={jogador[campo] ?? ''}
                          onChange={(evento) =>
                            alterarNota(
                              jogador.id,
                              campo,
                              evento.target.value
                            )
                          }
                        />
                      </td>
                    ))}

                    <td>{jogador.isGoleiro ? 'Sim' : 'Não'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="painel-lateral">
        <aside className="lista-atual">
        <h2>Quem vai jogar?</h2>
        <p>Cole a lista atual abaixo, com um nome por linha.</p>
        <textarea
          value={textoListaAtual}
          onChange={(evento) => {
            setTextoListaAtual(evento.target.value)
            setTimesGerados([])
            setErroTimes('')
            setMensagem('')
          }}
          placeholder={'Exemplo:\nCamillo\nMarcelinho\nDiogo Ramon'}
          aria-label="Cole aqui a lista atual de jogadores"
        />

        <button className="botao-tirar-times" onClick={tirarTimes}>
          TIRAR TIMES
        </button>
        {erroTimes && <p className="erro-times" role="alert">{erroTimes}</p>}

        <h3>Jogadores na lista ({nomesColados.length})</h3>
        {jogadoresDaLista.length > 0 ? (
          <ul>
            {jogadoresDaLista.map((item, indice) => (
              <li
                key={`${normalizarNome(item.nome)}-${indice}`}
                className={
                  item.status === 'ambiguo'
                    ? 'nome-ambiguo'
                    : item.jogador
                      ? ''
                      : 'nome-nao-encontrado'
                }
              >
                <span>{item.jogador?.nome ?? item.nome}</span>
                <small>
                  {item.jogador
                    ? item.jogador.isGoleiro
                      ? 'Goleiro'
                      : `Média ${calcularMedia(item.jogador)?.toFixed(2) ?? '—'}`
                    : item.status === 'ambiguo'
                      ? `Ambíguo: ${item.candidatos.map((jogador) => jogador.nome).join(' / ')}`
                      : 'Não encontrado no cadastro'}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="lista-vazia">A lista colada aparecerá aqui.</p>
        )}
        </aside>

        <section className="painel-times">
        <h2>TIMES</h2>
        {timesGerados.length > 0 ? (
          <div className="times-gerados">
            {timesGerados.map((time, indice) => (
              <article className="cartao-time" key={indice}>
                <h3>Time {indice + 1} <span>Média {time.media.toFixed(2)}</span></h3>
                <ol>
                  {time.jogadores.map((jogador) => (
                    <li key={jogador.id}>
                      {jogador.nome}
                      <small>{calcularMedia(jogador).toFixed(2)}</small>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        ) : (
          <p className="lista-vazia">Os times gerados aparecerão aqui.</p>
        )}
        </section>
      </div>
    </div>
  )
}

export default TabelaJogadores
