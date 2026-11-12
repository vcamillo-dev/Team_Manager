import { Fragment, useEffect, useState } from 'react'
import { atualizarNotas, listarJogadores } from '../services/jogadoresApi'
import '../App.css'

// Esses são os campos que entram na média e que podem ser alterados pela tabela.
const camposDasNotas = [
  'notaMarcelinho',
  'notaCamilinho',
  'notaConvidado',
]

function calcularMedia(jogador) {
  // Nota em branco não entra na conta.
  const notas = camposDasNotas
    .map((campo) => jogador[campo])
    .filter((nota) => nota !== null && nota !== undefined)

  // Se não tem nenhuma nota, não tem média para calcular.
  if (notas.length === 0) return null

  return notas.reduce((soma, nota) => soma + nota, 0) / notas.length
}

function jogadoresSaoIguais(jogadorA, jogadorB) {
  // Comparo nome e notas para saber se esse jogador precisa ser salvo.
  if (jogadorA.nome !== jogadorB.nome) return false

  return camposDasNotas.every(
    (campo) => jogadorA[campo] === jogadorB[campo]
  )
}

function normalizarNomeParaValidacao(nome) {
  // Tiro acento e espaço sobrando para conferir se o nome já existe.
  return nome
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
}

function normalizarNome(nome) {
  // Na lista do dia, ignoro quem convidou e acentos; LINHA e GOLEIRO continuam valendo.
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

// Alguns nomes vêm abreviados na lista. Aqui eu digo qual é o nome no cadastro.
const aliasesJogadores = {
  [normalizarNome('Leônidas Germano')]: 'Leônidas',
  [normalizarNome('Camilinho')]: 'Camillo',
  [normalizarNome('Eduardo Sabino')]: 'Dudu Sabino',
  [normalizarNome('Turra')]: 'Pedro Turra',
  [normalizarNome('Felipe Fifi')]: 'Fifi',
  [normalizarNome('Felipe Maia')]: 'Maia',
  [normalizarNome('Cosme Olímpio')]: 'Cosme',
  [normalizarNome('João Carlos Neri')]: 'JC',
  [normalizarNome('Lucas Medeiros Garrote')]: 'Garrote',
  [normalizarNome('Matheus Vitoriano Magão')]: 'Magão',
  [normalizarNome('Laur')]: 'Lauir',
  [normalizarNome('Julio César')]: 'Julio (LINHA)',
  [normalizarNome('Julio César (LINHA)')]: 'Julio (LINHA)',
  [normalizarNome('Julio César (GOLEIRO)')]: 'Julio (GOLEIRO)',
}

function resolverJogadorPorNome(nome, jogadores) {
  const nomeNormalizado = normalizarNome(nome)
  const nomeCanonico = aliasesJogadores[nomeNormalizado]

  if (nomeCanonico) {
    // Se existe um apelido conhecido, procuro pelo nome certo do cadastro.
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

  // Se o primeiro nome aponta para mais de uma pessoa, não escolho no chute.
  // Mostro as opções para a pessoa ajustar o nome da lista.
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
  // Tiro o número, o check e a observação de quem convidou antes de buscar o jogador.
  return linha
    .split('\t')[0]
    .replace(/^\s*\d+\s*(?:[-.)]\s*|\s+)/, '')
    .replace(/\(([^)]*)\)/g, (_, conteudo) => {
      const funcao = conteudo.trim().toLocaleLowerCase('pt-BR')
      return funcao === 'goleiro' || funcao === 'linha' ? ` ${funcao} ` : ' '
    })
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/✅|✔️?|✓|☑️?|☒️?|\[[xX]\]|\([xX]\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function encontrarDivisaoMaisEquilibrada(jogadoresLinha) {
  // Recebo 16 jogadores de linha e monto grupos de quatro usando a média de cada um.
  const quantidade = jogadoresLinha.length
  const medias = jogadoresLinha.map(calcularMedia)
  const gruposPorPrimeiroIndice = Array.from(
    { length: quantidade },
    () => []
  )

  // Primeiro monto todos os grupos possíveis de quatro jogadores.
  for (let a = 0; a < quantidade - 3; a++) {
    for (let b = a + 1; b < quantidade - 2; b++) {
      for (let c = b + 1; c < quantidade - 1; c++) {
        for (let d = c + 1; d < quantidade; d++) {
          // Cada bit marca um jogador. A máscara representa esse grupo de quatro.
          const mascara = (1 << a) | (1 << b) | (1 << c) | (1 << d)
          const soma = medias[a] + medias[b] + medias[c] + medias[d]
          gruposPorPrimeiroIndice[a].push({ mascara, soma })
        }
      }
    }
  }

  // Guardo a soma das médias de cada grupo para não recalcular isso toda hora.
  const limite = 1 << quantidade
  const somaPorMascara = new Float64Array(limite)
  for (let mascara = 1; mascara < limite; mascara++) {
    // Pego um jogador marcado, somo a média dele ao total dos outros bits da máscara.
    const bit = mascara & -mascara
    const indice = Math.log2(bit)
    somaPorMascara[mascara] =
      somaPorMascara[mascara ^ bit] + medias[indice]
  }

  let melhorDiferenca = Infinity
  let melhorVariancia = Infinity
  let melhoresMascaras = []
  // Enquanto procuro, guardo aqui os três times que já foram montados.
  const mascarasDosTimes = []
  const somasDosTimes = []

  function avaliarUltimoTime(mascaraRestante) {
    // Com os quatro times montados, comparo o total de cada um.
    const somas = [...somasDosTimes, somaPorMascara[mascaraRestante]]
    const maiorSoma = Math.max(...somas)
    const menorSoma = Math.min(...somas)
    // Como todos os times têm quatro jogadores, comparar as somas é igual a comparar as médias.
    const diferenca = maiorSoma - menorSoma
    const mediaGeral = somas.reduce((total, soma) => total + soma, 0) / 4
    const variancia = somas.reduce(
      (total, soma) => total + (soma - mediaGeral) ** 2,
      0
    )

    // Primeiro minimizo a diferença entre o time mais forte e o mais fraco.
    // Se duas divisões empatam, escolho a que deixa os quatro totais mais próximos.
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

    // Começo pelo primeiro jogador ainda sem time para não testar a mesma divisão em outra ordem.
    const primeiroBit = mascaraRestante & -mascaraRestante
    const primeiroIndice = Math.log2(primeiroBit)

    for (const grupo of gruposPorPrimeiroIndice[primeiroIndice]) {
      // Só coloco esse grupo se os quatro ainda estiverem disponíveis.
      if ((mascaraRestante & grupo.mascara) !== grupo.mascara) continue

      mascarasDosTimes.push(grupo.mascara)
      somasDosTimes.push(grupo.soma)
      buscarDivisao(mascaraRestante ^ grupo.mascara)
      // Volto um passo e testo outro grupo que também pode caber nessa divisão.
      mascarasDosTimes.pop()
      somasDosTimes.pop()
    }
  }

  buscarDivisao(limite - 1)

  // Transformo as máscaras de volta em nomes e ordeno pelo total do time.
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

function TabelaJogadores({ somenteTimes = false }) {
  // 'jogadores' tem o que está na tela; 'jogadoresOriginais' tem o que veio do banco.
  // Com as duas listas eu sei o que mudou sem mexer no banco enquanto a pessoa digita.
  const [jogadores, setJogadores] = useState([])
  const [jogadoresOriginais, setJogadoresOriginais] = useState([])
  const [carregandoJogadores, setCarregandoJogadores] = useState(true)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [ordenarPor, setOrdenarPor] = useState('nome')
  const [ordem, setOrdem] = useState('asc')
  const [buscaJogador, setBuscaJogador] = useState('')
  const [jogadorExpandidoId, setJogadorExpandidoId] = useState(null)
  const [textoListaAtual, setTextoListaAtual] = useState('')
  const [timesGerados, setTimesGerados] = useState([])
  const [editandoTimes, setEditandoTimes] = useState(false)
  const [jogadorSelecionado, setJogadorSelecionado] = useState(null)
  const [mensagemTimes, setMensagemTimes] = useState('')
  const [erroTimes, setErroTimes] = useState('')
  const [statusCopia, setStatusCopia] = useState('')

  useEffect(() => {
    // Carrego a lista do banco quando a Administração abre.
    listarJogadores()
      .then((resposta) => {
        setJogadores(resposta.data)
        setJogadoresOriginais(resposta.data)
      })
      .catch(() => setErro('Não foi possível carregar os jogadores.'))
      .finally(() => setCarregandoJogadores(false))
  }, [])

  const temAlteracoes = jogadores.some((jogador) => {
    const original = jogadoresOriginais.find(
      (item) => item.id === jogador.id
    )

    return original && !jogadoresSaoIguais(jogador, original)
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
    const jogadorASalvo = jogadoresOriginais.find(
      (item) => item.id === jogadorA.id
    ) ?? jogadorA
    const jogadorBSalvo = jogadoresOriginais.find(
      (item) => item.id === jogadorB.id
    ) ?? jogadorB

    if (ordenarPor === 'nome') {
      const comparacao = jogadorASalvo.nome.localeCompare(
        jogadorBSalvo.nome,
        'pt-BR'
      )

      return ordem === 'asc' ? comparacao : -comparacao
    }

    // Goleiros ficam no fim quando a lista é ordenada pela média.
    if (jogadorASalvo.isGoleiro !== jogadorBSalvo.isGoleiro) {
      return jogadorASalvo.isGoleiro ? 1 : -1
    }

    const mediaA = calcularMedia(jogadorASalvo)
    const mediaB = calcularMedia(jogadorBSalvo)

    if (mediaA === null && mediaB !== null) return 1
    if (mediaB === null && mediaA !== null) return -1
    if (mediaA === null && mediaB === null) return 0

    const comparacao = mediaA - mediaB
    return ordem === 'asc' ? comparacao : -comparacao
  })

  const jogadoresVisiveis = jogadoresOrdenados.filter((jogador) =>
    normalizarNomeParaValidacao(jogador.nome).includes(
      normalizarNomeParaValidacao(buscaJogador)
    )
  )

  const nomesColados = textoListaAtual
    .split(/\r?\n/)
    .map(limparNomeColado)
    .filter(Boolean)

  const jogadoresDaLista = nomesColados.map((nome) => ({
    nome,
    ...resolverJogadorPorNome(nome, jogadores),
  }))

  const jogadoresDeLinhaReconhecidos = jogadoresDaLista
    .filter((item) => item.jogador && !item.jogador.isGoleiro)
  const contagemDeJogadoresNaLista = new Map()
  for (const item of jogadoresDeLinhaReconhecidos) {
    const id = item.jogador.id
    contagemDeJogadoresNaLista.set(id, (contagemDeJogadoresNaLista.get(id) ?? 0) + 1)
  }
  const idsDuplicadosNaLista = new Set(
    [...contagemDeJogadoresNaLista]
      .filter(([, quantidade]) => quantidade > 1)
      .map(([id]) => id)
  )
  const quantidadeJogadoresDeLinha = new Set(
    jogadoresDeLinhaReconhecidos.map((item) => item.jogador.id)
  ).size
  const quantidadeGoleirosNaLista = jogadoresDaLista.filter(
    (item) => item.jogador?.isGoleiro
  ).length
  const nomesParaConferir = jogadoresDaLista.filter(
    (item) => item.status !== 'encontrado' || idsDuplicadosNaLista.has(item.jogador?.id)
  )

  const idsNaLista = new Set(
    jogadoresDaLista
      .filter((item) => item.jogador)
      .map((item) => item.jogador.id)
  )

  function alterarNota(id, campo, valor) {
    // Atualizo o rascunho. O banco só muda quando clicarem em Salvar alterações.
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
    setStatusCopia('')
  }

  function alterarNome(id, nome) {
    // O nome também fica como rascunho até ser salvo.
    setJogadores((listaAtual) =>
      listaAtual.map((jogador) =>
        jogador.id === id ? { ...jogador, nome } : jogador
      )
    )
    setMensagem('')
    setErro('')
  }

  function cancelarEdicao() {
    // Desfaço as mudanças que ainda não foram salvas.
    setJogadores(jogadoresOriginais)
    setEditando(false)
    setErro('')
    setMensagem('')
  }

  function tirarTimes() {
    // Apago o resultado anterior e confiro a lista antes de montar os times.
    setTimesGerados([])
    setErroTimes('')
    setStatusCopia('')
    setMensagemTimes('')
    setEditandoTimes(false)
    setJogadorSelecionado(null)

    // Primeiro vejo se tem nome que não achei, nome duvidoso ou jogador repetido.
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
    // Os goleiros aparecem na lista, mas não entram nos quatro times de linha.
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
      // Se tem algum problema, paro aqui em vez de sortear uma lista errada.
      setErroTimes(problemas.join(' '))
      return
    }

    // Com 16 jogadores válidos, procuro a divisão mais equilibrada.
    setTimesGerados(encontrarDivisaoMaisEquilibrada(jogadoresLinha))
    if (goleirosNaLista.length > 0) {
      setMensagemTimes(
        `${goleirosNaLista.length} goleiro(s) ficaram fora dos times e do cálculo de equilíbrio.`
      )
    } else {
      setMensagemTimes('Times montados com 16 jogadores de linha; goleiros ficam fora do sorteio.')
    }
  }

  function selecionarJogadorParaTroca(indiceTime, idJogador) {
    if (!editandoTimes) return

    if (!jogadorSelecionado) {
      setJogadorSelecionado({ indiceTime, idJogador })
      setMensagemTimes('Jogador selecionado. Escolha alguém de outro time para trocar.')
      return
    }

    if (
      jogadorSelecionado.indiceTime === indiceTime &&
      jogadorSelecionado.idJogador === idJogador
    ) {
      setJogadorSelecionado(null)
      setMensagemTimes('Seleção cancelada.')
      return
    }

    if (jogadorSelecionado.indiceTime === indiceTime) {
      setJogadorSelecionado({ indiceTime, idJogador })
      setMensagemTimes('Escolha um jogador de outro time para fazer a troca.')
      return
    }

    const jogadorOrigem = jogadorSelecionado
    setTimesGerados((timesAtuais) => {
      const novosTimes = timesAtuais.map((time) => ({
        ...time,
        jogadores: [...time.jogadores],
      }))
      const jogadoresOrigem = novosTimes[jogadorOrigem.indiceTime]?.jogadores
      const jogadoresDestino = novosTimes[indiceTime]?.jogadores
      const indiceOrigem = jogadoresOrigem?.findIndex(
        (jogador) => jogador.id === jogadorOrigem.idJogador
      )
      const indiceDestino = jogadoresDestino?.findIndex(
        (jogador) => jogador.id === idJogador
      )

      if (
        !jogadoresOrigem ||
        !jogadoresDestino ||
        indiceOrigem === -1 ||
        indiceDestino === -1
      ) return timesAtuais

      const jogadorMovido = jogadoresOrigem[indiceOrigem]
      jogadoresOrigem[indiceOrigem] = jogadoresDestino[indiceDestino]
      jogadoresDestino[indiceDestino] = jogadorMovido

      return novosTimes.map((time) => ({
        ...time,
        media: time.jogadores.reduce(
          (soma, jogador) => soma + (calcularMedia(jogador) ?? 0),
          0
        ) / time.jogadores.length,
      }))
    })

    setJogadorSelecionado(null)
    setMensagemTimes('Troca feita. As médias dos times foram atualizadas.')
  }

  function concluirEdicaoTimes() {
    setEditandoTimes(false)
    setJogadorSelecionado(null)
    setMensagemTimes('Edição concluída. As mudanças valem para este sorteio.')
  }

  async function copiarTimes() {
    // Junto os nomes em texto para copiar e colar no grupo.
    const textoTimes = timesGerados
      .map((time, indice) =>
        [
          `TIME ${indice + 1} (média ${time.media.toFixed(2)})`,
          ...time.jogadores.map((jogador) => `- ${jogador.nome}`),
        ].join('\n')
      )
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(textoTimes)
      setStatusCopia('Lista de times copiada.')
    } catch {
      setStatusCopia('Não foi possível copiar a lista de times.')
    }
  }

  async function salvarAlteracoes() {
    // Envio só os jogadores que realmente mudaram.
    const jogadoresAlterados = jogadores.filter((jogador) => {
      const original = jogadoresOriginais.find(
        (item) => item.id === jogador.id
      )

      return original && !jogadoresSaoIguais(jogador, original)
    })

    if (jogadoresAlterados.length === 0) {
      setMensagem('Não há alterações para salvar.')
      setEditando(false)
      return
    }

    // Não deixo salvar nome vazio nem criar repetição nova.
    // Nomes que já eram repetidos no cadastro, como linha e goleiro, podem continuar iguais.
    const nomeVazio = jogadores.some((jogador) => !jogador.nome.trim())
    const nomesDuplicados = []

    for (let indice = 0; indice < jogadores.length; indice++) {
      for (let proximoIndice = indice + 1; proximoIndice < jogadores.length; proximoIndice++) {
        const atual = jogadores[indice]
        const proximo = jogadores[proximoIndice]

        if (normalizarNomeParaValidacao(atual.nome) !== normalizarNomeParaValidacao(proximo.nome)) {
          continue
        }

        const originalAtual = jogadoresOriginais.find((item) => item.id === atual.id)
        const originalProximo = jogadoresOriginais.find((item) => item.id === proximo.id)
        const duplicidadePreexistente = originalAtual && originalProximo &&
          normalizarNomeParaValidacao(originalAtual.nome) === normalizarNomeParaValidacao(originalProximo.nome)

        if (!duplicidadePreexistente) {
          nomesDuplicados.push(atual.nome.trim())
        }
      }
    }
    const nomeDuplicado = nomesDuplicados.length > 0

    if (nomeVazio || nomeDuplicado) {
      setErro(nomeVazio
        ? 'Preencha o nome de todos os jogadores antes de salvar.'
        : 'Há nomes repetidos na tabela. Ajuste-os antes de salvar.')
      return
    }

    setSalvando(true)
    setErro('')
    setMensagem('')

    const resultados = await Promise.allSettled(
      // Cada jogador alterado é enviado separadamente para a API.
      jogadoresAlterados.map((jogador) =>
        atualizarNotas(jogador.id, {
          nome: jogador.nome.trim(),
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
      // Atualizo a lista original com o retorno do servidor para limpar o rascunho salvo.
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
      setEditando(false)
    } else {
      setErro(
        `${jogadoresSalvos.length} jogador(es) salvo(s); ${quantidadeComErro} não puderam ser salvos.`
      )
    }

    setSalvando(false)
  }

  return (
    <div className={`painel-administracao ${somenteTimes ? 'pagina-times' : 'somente-notas'}${editando && !somenteTimes ? ' editando-notas' : ''}`}>
      {!somenteTimes && (
        <div className="acoes-administracao">
          {!editando ? (
            <button onClick={() => setEditando(true)} disabled={salvando}>
              Editar
            </button>
          ) : (
            <div className="botoes-edicao">
              <button onClick={salvarAlteracoes} disabled={salvando || !temAlteracoes}>
                {salvando ? 'Salvando…' : 'Salvar alterações'}
              </button>
              <button onClick={cancelarEdicao} disabled={salvando}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {!somenteTimes && <section className="painel-notas">
        {erro && <p>{erro}</p>}
        {mensagem && <p>{mensagem}</p>}

        <div className="mobile-player-tools">
          <label className="busca-jogador-mobile">
            <span className="sr-only">Buscar jogador pelo nome</span>
            <input
              type="search"
              value={buscaJogador}
              onChange={(evento) => setBuscaJogador(evento.target.value)}
              placeholder="Buscar jogador"
            />
          </label>
          <label className="ordenacao-mobile">
            <span className="sr-only">Ordenar jogadores</span>
            <select
              value={`${ordenarPor}:${ordem}`}
              onChange={(evento) => {
                const [campo, direcao] = evento.target.value.split(':')
                setOrdenarPor(campo)
                setOrdem(direcao)
              }}
            >
              <option value="nome:asc">Nome: A a Z</option>
              <option value="nome:desc">Nome: Z a A</option>
              <option value="media:desc">Média: maior primeiro</option>
              <option value="media:asc">Média: menor primeiro</option>
            </select>
          </label>
        </div>

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
              {jogadoresVisiveis.length === 0 ? (
                <tr className="linha-sem-jogadores">
                  <td colSpan="6">
                    {jogadores.length === 0
                      ? 'Carregando jogadores…'
                      : 'Nenhum jogador encontrado com esse nome.'}
                  </td>
                </tr>
              ) : jogadoresVisiveis.map((jogador) => {
                const jogadorSalvo = jogadoresOriginais.find(
                  (item) => item.id === jogador.id
                ) ?? jogador
                const media = jogadorSalvo.isGoleiro
                  ? null
                  : calcularMedia(jogadorSalvo)
                const jogadorEstaExpandido = jogadorExpandidoId === jogador.id

                return (
                  <Fragment key={jogador.id}>
                    <tr
                      className={`linha-resumo-jogador${idsNaLista.has(jogador.id) ? ' jogador-na-lista' : ''}${jogadorEstaExpandido ? ' jogador-expandido' : ''}`}
                    >
                      <td>
                        <span className="nome-jogador-desktop">
                          {editando ? (
                            <input
                              className="input-nome-jogador"
                              type="text"
                              value={jogador.nome}
                              onChange={(evento) => alterarNome(jogador.id, evento.target.value)}
                              aria-label={`Nome de ${jogadorSalvo.nome}`}
                            />
                          ) : jogador.nome}
                        </span>
                        <button
                          type="button"
                          className="resumo-jogador-mobile"
                          aria-expanded={jogadorEstaExpandido}
                          onClick={() => setJogadorExpandidoId(jogadorEstaExpandido ? null : jogador.id)}
                        >
                          <span>{jogador.nome}</span>
                          <span className="resumo-jogador-direita">
                            <strong>{jogadorSalvo.isGoleiro ? 'Goleiro' : `Média ${media === null ? '—' : media.toFixed(2)}`}</strong>
                            <span className="seta-expansao" aria-hidden="true">⌄</span>
                          </span>
                        </button>
                      </td>
                      <td>{media === null ? '—' : media.toFixed(2)}</td>

                      {camposDasNotas.map((campo) => (
                        <td key={campo}>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.01"
                            value={jogador[campo] ?? ''}
                            disabled={!editando}
                            onChange={(evento) =>
                              alterarNota(jogador.id, campo, evento.target.value)
                            }
                          />
                        </td>
                      ))}

                      <td>{jogador.isGoleiro ? 'Sim' : 'Não'}</td>
                    </tr>
                    <tr
                      className={`linha-detalhes-mobile${jogadorEstaExpandido ? ' aberta' : ''}`}
                      aria-hidden={!jogadorEstaExpandido}
                    >
                      <td colSpan="6">
                        <div className="detalhes-notas-mobile">
                          {editando && (
                            <label>
                              Nome
                              <input
                                className="input-nome-jogador"
                                type="text"
                                value={jogador.nome}
                                onChange={(evento) => alterarNome(jogador.id, evento.target.value)}
                                aria-label={`Nome de ${jogadorSalvo.nome}`}
                              />
                            </label>
                          )}
                          {camposDasNotas.map((campo, indice) => (
                            editando ? (
                              <label key={campo}>
                                {['Nota de Marcelinho', 'Nota de Camillo', 'Nota do convidado'][indice]}
                                <input
                                  type="number"
                                  min="0"
                                  max="5"
                                  step="0.01"
                                  value={jogador[campo] ?? ''}
                                  onChange={(evento) => alterarNota(jogador.id, campo, evento.target.value)}
                                />
                              </label>
                            ) : (
                              <div className="detalhe-nota-mobile" key={campo}>
                                <span>{['Nota de Marcelinho', 'Nota de Camillo', 'Nota do convidado'][indice]}</span>
                                <strong>{jogadorSalvo[campo] ?? '—'}</strong>
                              </div>
                            )
                          ))}
                          <div className="detalhe-nota-mobile">
                            <span>Goleiro</span>
                            <strong>{jogadorSalvo.isGoleiro ? 'Sim' : 'Não'}</strong>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>}

      {somenteTimes && <div className="painel-lateral area-construtor-times">
        <aside className="lista-atual">
        <div className="titulo-lista-times">
          <div>
            <h2>Quem vai jogar?</h2>
            <p>Cole a lista atual, com um nome por linha.</p>
          </div>
          {carregandoJogadores ? (
            <span className="status-lista">Carregando cadastro…</span>
          ) : !erro ? (
            <span className={quantidadeJogadoresDeLinha === 16 && jogadoresDeLinhaReconhecidos.length === 16 && nomesParaConferir.length === 0 ? 'status-lista pronta' : 'status-lista'}>
              {quantidadeJogadoresDeLinha}/16 de linha
            </span>
          ) : null}
        </div>
        <textarea
          value={textoListaAtual}
          onChange={(evento) => {
            setTextoListaAtual(evento.target.value)
            setTimesGerados([])
            setEditandoTimes(false)
            setJogadorSelecionado(null)
            setErroTimes('')
            setStatusCopia('')
            setMensagemTimes('')
            setMensagem('')
          }}
          placeholder={'Exemplo:\nCamillo\nMarcelinho\nDiogo Ramon'}
          aria-label="Cole aqui a lista atual de jogadores"
        />

        {erro && (
          <p className="erro-times" role="alert">
            Não consegui carregar o cadastro de jogadores. Confira se o backend está rodando e tente recarregar esta página.
          </p>
        )}
        <button
          className="botao-tirar-times"
          onClick={tirarTimes}
          disabled={carregandoJogadores || Boolean(erro) || jogadores.length === 0}
        >
          {timesGerados.length > 0 ? 'Sortear novamente' : 'Tirar times'}
        </button>
        {erroTimes && <p className="erro-times" role="alert">{erroTimes}</p>}

        <div className="resumo-lista-times">
          <span>{nomesColados.length} nomes na lista</span>
          {quantidadeGoleirosNaLista > 0 && (
            <span>{quantidadeGoleirosNaLista} goleiro(s) ficam fora dos times</span>
          )}
        </div>
        {!carregandoJogadores && !erro && nomesParaConferir.length > 0 ? (
          <>
            <h3>Confira estes nomes</h3>
            <ul>
              {nomesParaConferir.map((item, indice) => (
                <li
                  key={`${normalizarNome(item.nome)}-${indice}`}
                  className={item.status === 'ambiguo' ? 'nome-ambiguo' : 'nome-nao-encontrado'}
                >
                  <span>{item.nome}</span>
                  <small>
                    {item.status === 'ambiguo'
                      ? `Pode ser: ${item.candidatos.map((jogador) => jogador.nome).join(' / ')}`
                      : idsDuplicadosNaLista.has(item.jogador?.id)
                        ? 'Este jogador aparece mais de uma vez'
                        : 'Não encontrado no cadastro'}
                  </small>
                </li>
              ))}
            </ul>
          </>
        ) : !carregandoJogadores && !erro && nomesColados.length > 0 ? (
          <p className="nomes-reconhecidos">Todos os nomes foram reconhecidos.</p>
        ) : !carregandoJogadores && !erro ? (
          <p className="lista-vazia">A lista colada aparecerá aqui.</p>
        ) : null}
        </aside>

        <section className="painel-times">
        <div className="cabecalho-times">
          <div>
            <h2>Times</h2>
            {timesGerados.length > 0 && <p>Quatro grupos montados pela média dos jogadores.</p>}
          </div>
          <div className="acoes-times">
            {timesGerados.length > 0 && (
              <button
                className="botao-editar-times"
                onClick={editandoTimes ? concluirEdicaoTimes : () => {
                  setEditandoTimes(true)
                  setMensagemTimes('Selecione dois jogadores de times diferentes para trocar.')
                }}
              >
                {editandoTimes ? 'Concluir edição' : 'Editar times'}
              </button>
            )}
          <button
            className="botao-copiar-times"
            onClick={copiarTimes}
            disabled={timesGerados.length === 0}
            title="Copiar lista dos times"
            aria-label="Copiar lista dos times"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="8" y="8" width="13" height="13" rx="2" />
              <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
          </div>
        </div>
        {statusCopia && <p className="status-copia" role="status">{statusCopia}</p>}
        {mensagemTimes && <p className="mensagem-times" role="status">{mensagemTimes}</p>}
        {editandoTimes && <p className="ajuda-edicao-times">Arraste um jogador para outro time ou selecione dois para trocar.</p>}
        {timesGerados.length > 0 ? (
          <div className="times-gerados">
            {timesGerados.map((time, indice) => (
              <article
                className="cartao-time"
                key={indice}
                onDragOver={(evento) => {
                  if (editandoTimes) evento.preventDefault()
                }}
              >
                <h3>Time {indice + 1} <span>Média {time.media.toFixed(2)}</span></h3>
                <ol>
                  {time.jogadores.map((jogador) => (
                    <li
                      key={jogador.id}
                      draggable={editandoTimes}
                      className={jogadorSelecionado?.indiceTime === indice && jogadorSelecionado?.idJogador === jogador.id ? 'jogador-selecionado' : undefined}
                      onDragStart={() => {
                        if (editandoTimes) setJogadorSelecionado({ indiceTime: indice, idJogador: jogador.id })
                      }}
                      onDrop={() => selecionarJogadorParaTroca(indice, jogador.id)}
                    >
                      <span className="nome-jogador-time">{jogador.nome}</span>
                      <small>Média {calcularMedia(jogador)?.toFixed(2) ?? '—'}</small>
                      {editandoTimes && (
                        <button
                          type="button"
                          className="botao-selecionar-troca"
                          aria-pressed={jogadorSelecionado?.indiceTime === indice && jogadorSelecionado?.idJogador === jogador.id}
                          onClick={() => selecionarJogadorParaTroca(indice, jogador.id)}
                        >
                          {jogadorSelecionado?.indiceTime === indice && jogadorSelecionado?.idJogador === jogador.id ? 'Selecionado' : 'Trocar'}
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        ) : (
          <p className="lista-vazia">Depois do sorteio, os quatro times aparecem aqui para você conferir e ajustar.</p>
        )}
        </section>
      </div>}
    </div>
  )
}

export default TabelaJogadores
