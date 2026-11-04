
var URL_GEOCODIFICACAO = "https://geocoding-api.open-meteo.com/v1/search";
var URL_PREVISAO = "https://api.open-meteo.com/v1/forecast";


var formPesquisa = document.getElementById("form-pesquisa");
var campoCidade = document.getElementById("campo-cidade");
var areaMensagens = document.getElementById("area-mensagens");
var listaResultados = document.getElementById("lista-resultados");
var painelAtual = document.getElementById("painel-atual");
var listaPrevisao = document.getElementById("lista-previsao");
var listaFavoritos = document.getElementById("lista-favoritos");


var favoritos = [];          // lista de cidades favoritas
var cidadeSelecionada = null; // cidade que está sendo exibida
var ultimoTermo = "";        // última pesquisa (para tentar de novo)
var numeroConsulta = 0;      // evita que uma resposta antiga apareça no lugar da nova


var descricoesTempo = {
  0: "Céu limpo",
  1: "Predominantemente limpo",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina com geada",
  51: "Garoa fraca",
  53: "Garoa moderada",
  55: "Garoa forte",
  56: "Garoa congelante fraca",
  57: "Garoa congelante forte",
  61: "Chuva fraca",
  63: "Chuva moderada",
  65: "Chuva forte",
  66: "Chuva congelante fraca",
  67: "Chuva congelante forte",
  71: "Neve fraca",
  73: "Neve moderada",
  75: "Neve forte",
  77: "Grãos de neve",
  80: "Pancadas de chuva fracas",
  81: "Pancadas de chuva moderadas",
  82: "Pancadas de chuva fortes",
  85: "Pancadas de neve fracas",
  86: "Pancadas de neve fortes",
  95: "Tempestade",
  96: "Tempestade com granizo fraco",
  99: "Tempestade com granizo forte"
};


function codigoParaDescricao(codigo) {
  if (codigo === null || codigo === undefined) {
    return "Não informado";
  }
  if (descricoesTempo[codigo]) {
    return descricoesTempo[codigo];
  }
  return "Condição desconhecida (código " + codigo + ")";
}



function mostrarMensagem(texto, tipo) {
  areaMensagens.className = "mensagem " + tipo;
  areaMensagens.textContent = texto;
}


function mostrarErroComTentarNovamente(texto, funcaoNovaTentativa) {
  mostrarMensagem(texto, "erro");
  var botao = document.createElement("button");
  botao.textContent = "Tentar novamente";
  botao.addEventListener("click", funcaoNovaTentativa);
  areaMensagens.appendChild(botao);
}


function formatarValor(valor, unidade) {
  if (valor === null || valor === undefined) {
    return "Não disponível";
  }
  return valor + " " + unidade;
}


function formatarData(texto) {
  var partes = texto.split("-");
  if (partes.length !== 3) {
    return texto;
  }
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}


function nomeCompleto(cidade) {
  var nome = cidade.nome;
  if (cidade.estado) {
    nome = nome + ", " + cidade.estado;
  }
  if (cidade.pais) {
    nome = nome + " - " + cidade.pais;
  }
  return nome;
}


async function buscarJson(url) {
  var resposta = await fetch(url);

  if (!resposta.ok) {
    throw new Error("HTTP " + resposta.status);
  }

  var dados = await resposta.json();
  return dados;
}



async function pesquisarCidades(termo) {
  numeroConsulta++;
  var minhaConsulta = numeroConsulta;
  ultimoTermo = termo;

 
  listaResultados.innerHTML = "";
  limparClima("Nenhuma cidade selecionada.");
  mostrarMensagem("Pesquisando cidades...", "carregando");

  var url = URL_GEOCODIFICACAO +
    "?name=" + encodeURIComponent(termo) +
    "&count=10&language=pt&format=json";

  try {
    var dados = await buscarJson(url);

   
    if (minhaConsulta !== numeroConsulta) {
      return;
    }

    
    if (!dados.results || dados.results.length === 0) {
      mostrarMensagem("Nenhuma cidade encontrada para \"" + termo + "\".", "info");
      return;
    }

    mostrarResultados(dados.results);
    mostrarMensagem(dados.results.length + " localidade(s) encontrada(s). Escolha uma.", "sucesso");

  } catch (erro) {
    if (minhaConsulta !== numeroConsulta) {
      return;
    }
    console.error(erro);
    mostrarErroComTentarNovamente(
      "Erro ao localizar a cidade. Verifique sua conexão e tente de novo.",
      function () {
        pesquisarCidades(ultimoTermo);
      }
    );
  }
}


function mostrarResultados(resultados) {
  listaResultados.innerHTML = "";

  for (var i = 0; i < resultados.length; i++) {
    var r = resultados[i];

   
    var cidade = {
      id: r.id,
      nome: r.name,
      estado: r.admin1 || "",
      pais: r.country || "",
      latitude: r.latitude,
      longitude: r.longitude
    };

    var item = document.createElement("li");
    item.className = "item";

    var texto = document.createElement("span");
    var detalhes = nomeCompleto(cidade) +
      " (lat " + cidade.latitude.toFixed(2) +
      ", lon " + cidade.longitude.toFixed(2) + ")";
    texto.textContent = detalhes;

    var botao = document.createElement("button");
    botao.textContent = "Ver clima";
    botao.addEventListener("click", criarCliqueSelecionar(cidade));

    item.appendChild(texto);
    item.appendChild(botao);
    listaResultados.appendChild(item);
  }
}


function criarCliqueSelecionar(cidade) {
  return function () {
    selecionarCidade(cidade);
  };
}



async function selecionarCidade(cidade) {
  
  if (typeof cidade.latitude !== "number" || typeof cidade.longitude !== "number") {
    mostrarMensagem("Esta cidade não tem coordenadas válidas.", "erro");
    return;
  }

  numeroConsulta++;
  var minhaConsulta = numeroConsulta;
  cidadeSelecionada = cidade;

 
  limparClima("Carregando...");
  mostrarMensagem("Carregando o clima de " + cidade.nome + "...", "carregando");

  var url = URL_PREVISAO +
    "?latitude=" + cidade.latitude +
    "&longitude=" + cidade.longitude +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=auto&forecast_days=5";

  try {
    var dados = await buscarJson(url);

    if (minhaConsulta !== numeroConsulta) {
      return;
    }

   
    if (!dados.current || !dados.daily) {
      throw new Error("Resposta inesperada da API");
    }

    mostrarClimaAtual(cidade, dados.current, dados.current_units);
    mostrarPrevisao(dados.daily, dados.daily_units);
    mostrarMensagem("Consulta concluída para " + cidade.nome + ".", "sucesso");

  } catch (erro) {
    if (minhaConsulta !== numeroConsulta) {
      return;
    }
    console.error(erro);
    limparClima("Não foi possível carregar os dados.");
    mostrarErroComTentarNovamente(
      "Erro ao consultar a previsão. Tente novamente.",
      function () {
        selecionarCidade(cidade);
      }
    );
  }
}


function limparClima(mensagem) {
  painelAtual.innerHTML = "";
  listaPrevisao.innerHTML = "";

  var p1 = document.createElement("p");
  p1.className = "vazio";
  p1.textContent = mensagem;
  painelAtual.appendChild(p1);

  var p2 = document.createElement("p");
  p2.className = "vazio";
  p2.textContent = mensagem;
  listaPrevisao.appendChild(p2);
}


function mostrarClimaAtual(cidade, atual, unidades) {
  painelAtual.innerHTML = "";
  unidades = unidades || {};

  var caixa = document.createElement("div");
  caixa.className = "painel";

  var titulo = document.createElement("h3");
  titulo.textContent = cidade.nome + (cidade.pais ? " - " + cidade.pais : "");
  caixa.appendChild(titulo);

  var temp = document.createElement("div");
  temp.className = "temperatura-grande";
  temp.textContent = formatarValor(atual.temperature_2m, unidades.temperature_2m || "°C");
  caixa.appendChild(temp);

  var linhas = [
    "Condição: " + codigoParaDescricao(atual.weather_code),
    "Vento: " + formatarValor(atual.wind_speed_10m, unidades.wind_speed_10m || "km/h"),
    "Sensação térmica: " + formatarValor(atual.apparent_temperature, unidades.apparent_temperature || "°C"),
    "Umidade: " + formatarValor(atual.relative_humidity_2m, unidades.relative_humidity_2m || "%")
  ];

  for (var i = 0; i < linhas.length; i++) {
    var p = document.createElement("p");
    p.textContent = linhas[i];
    caixa.appendChild(p);
  }

  // botão de favoritar
  var botaoFav = document.createElement("button");
  botaoFav.textContent = "⭐ Adicionar aos favoritos";
  botaoFav.addEventListener("click", function () {
    adicionarFavorito(cidade);
  });
  caixa.appendChild(botaoFav);

  painelAtual.appendChild(caixa);
}

function mostrarPrevisao(diario, unidades) {
  listaPrevisao.innerHTML = "";
  unidades = unidades || {};

  if (!diario.time || diario.time.length === 0) {
    var aviso = document.createElement("p");
    aviso.className = "vazio";
    aviso.textContent = "Previsão não disponível.";
    listaPrevisao.appendChild(aviso);
    return;
  }

  for (var i = 0; i < diario.time.length; i++) {
    var cartao = document.createElement("div");
    cartao.className = "cartao";

    var data = document.createElement("h4");
    data.textContent = formatarData(diario.time[i]);
    cartao.appendChild(data);

    var linhas = [
      codigoParaDescricao(diario.weather_code ? diario.weather_code[i] : null),
      "Mín: " + formatarValor(diario.temperature_2m_min ? diario.temperature_2m_min[i] : null, unidades.temperature_2m_min || "°C"),
      "Máx: " + formatarValor(diario.temperature_2m_max ? diario.temperature_2m_max[i] : null, unidades.temperature_2m_max || "°C"),
      "Chuva: " + formatarValor(diario.precipitation_probability_max ? diario.precipitation_probability_max[i] : null, unidades.precipitation_probability_max || "%")
    ];

    for (var j = 0; j < linhas.length; j++) {
      var p = document.createElement("p");
      p.textContent = linhas[j];
      cartao.appendChild(p);
    }

    listaPrevisao.appendChild(cartao);
  }
}



function carregarFavoritos() {
  try {
    var texto = localStorage.getItem("favoritos");
    if (!texto) {
      favoritos = [];
      return;
    }
    var lista = JSON.parse(texto);

    // se não for uma lista, ignora
    if (!Array.isArray(lista)) {
      favoritos = [];
      return;
    }

    // mantém só os itens que parecem válidos
    favoritos = lista.filter(function (f) {
      return f && typeof f.nome === "string" &&
        typeof f.latitude === "number" &&
        typeof f.longitude === "number";
    });
  } catch (erro) {
    console.error(erro);
    favoritos = [];
  }
}

function salvarFavoritos() {
  try {
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
  } catch (erro) {
    console.error(erro);
    mostrarMensagem("Não foi possível salvar os favoritos neste navegador.", "erro");
  }
}

// Duas cidades são iguais se tiverem o mesmo id ou as mesmas coordenadas
function mesmaCidade(a, b) {
  if (a.id !== undefined && b.id !== undefined && a.id === b.id) {
    return true;
  }
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

function adicionarFavorito(cidade) {
  for (var i = 0; i < favoritos.length; i++) {
    if (mesmaCidade(favoritos[i], cidade)) {
      mostrarMensagem(cidade.nome + " já está nos favoritos.", "info");
      return;
    }
  }

  favoritos.push(cidade);
  salvarFavoritos();
  mostrarFavoritos();
  mostrarMensagem(cidade.nome + " foi adicionada aos favoritos.", "sucesso");
}

function removerFavorito(indice) {
  var removida = favoritos[indice];
  favoritos.splice(indice, 1);
  salvarFavoritos();
  mostrarFavoritos();
  mostrarMensagem(removida.nome + " foi removida dos favoritos.", "info");
}

function mostrarFavoritos() {
  listaFavoritos.innerHTML = "";

  if (favoritos.length === 0) {
    var vazio = document.createElement("li");
    vazio.className = "vazio";
    vazio.textContent = "Você ainda não tem cidades favoritas.";
    listaFavoritos.appendChild(vazio);
    return;
  }

  for (var i = 0; i < favoritos.length; i++) {
    var fav = favoritos[i];

    var item = document.createElement("li");
    item.className = "item";

    var texto = document.createElement("span");
    texto.textContent = nomeCompleto(fav);

    var botoes = document.createElement("div");
    botoes.className = "botoes";

    var botaoVer = document.createElement("button");
    botaoVer.textContent = "Ver clima";
    botaoVer.addEventListener("click", criarCliqueSelecionar(fav));

    var botaoRemover = document.createElement("button");
    botaoRemover.textContent = "Remover";
    botaoRemover.className = "perigo";
    botaoRemover.addEventListener("click", criarCliqueRemover(i));

    botoes.appendChild(botaoVer);
    botoes.appendChild(botaoRemover);
    item.appendChild(texto);
    item.appendChild(botoes);
    listaFavoritos.appendChild(item);
  }
}

function criarCliqueRemover(indice) {
  return function () {
    removerFavorito(indice);
  };
}



formPesquisa.addEventListener("submit", function (evento) {
  evento.preventDefault(); // não recarrega a página

  var termo = campoCidade.value.trim();

  // não pesquisa se estiver vazio
  if (termo === "") {
    mostrarMensagem("Digite o nome de uma cidade antes de pesquisar.", "erro");
    return;
  }

  pesquisarCidades(termo);
});



carregarFavoritos();
mostrarFavoritos();
