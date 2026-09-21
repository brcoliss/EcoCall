/* Wizard de cadastro: alternância usuário/empresa, validação por etapa, máscaras, busca de CEP (ViaCEP) e cidades por UF (IBGE API + Fallback). */
(function () {
  var tipo = 'user';

  var cidadesPorEstado = {
    'AC': ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó', 'Plácido de Castro', 'Xapuri', 'Brasiléia'],
    'AL': ['Maceió', 'Arapiraca', 'Rio Largo', 'Palmeira dos Índios', 'União dos Palmares', 'Penedo', 'Delmiro Gouveia'],
    'AP': ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão', 'Porto Grande'],
    'AM': ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tabatinga', 'Tefé', 'Maués', 'Humaitá'],
    'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Juazeiro', 'Lauro de Freitas', 'Itabuna', 'Ilhéus', 'Porto Seguro', 'Barreiras'],
    'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato', 'Itapipoca', 'Maranguape', 'Iguatu'],
    'DF': ['Brasília', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Plano Piloto', 'Águas Claras', 'Gama', 'Santa Maria'],
    'ES': ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Cachoeiro de Itapemirim', 'Linhares', 'Colatina', 'Guarapari'],
    'GO': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Águas Lindas de Goiás', 'Luziânia', 'Valparaíso de Goiás'],
    'MA': ['São Luís', 'Imperatriz', 'São José de Ribamar', 'Caxias', 'Timon', 'Codó', 'Paço do Lumiar', 'Açailândia'],
    'MT': ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Sorriso', 'Lucas do Rio Verde'],
    'MS': ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Sidrolândia', 'Naviraí'],
    'MG': ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Montes Claros', 'Betim', 'Uberaba', 'Governador Valadares', 'Ipatinga', 'Sete Lagoas'],
    'PA': ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Parauapebas', 'Castanhal', 'Abaetetuba', 'Cametá'],
    'PB': ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Sousa', 'Cajazeiras', 'Cabedelo'],
    'PR': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu', 'Colombo', 'Guarapuava', 'Paranaguá'],
    'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista', 'Cabo de Santo Agostinho', 'Camaragibe'],
    'PI': ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Campo Maior', 'Barras'],
    'RJ': ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Campos dos Goytacazes', 'Belford Roxo', 'São João de Meriti', 'Petrópolis', 'Volta Redonda', 'Macaé', 'Cabo Frio', 'Angra dos Reis', 'Resende', 'Teresópolis', 'Nova Friburgo'],
    'RN': ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Ceará-Mirim', 'Macaíba', 'Caicó'],
    'RS': ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Santa Maria', 'Gravataí', 'Viamão', 'Novo Hamburgo', 'São Leopoldo', 'Rio Grande', 'Passo Fundo', 'Bento Gonçalves'],
    'RO': ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Cacoal', 'Vilhena', 'Jaru', 'Rolim de Moura'],
    'RR': ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Pacaraima', 'Cantá'],
    'SC': ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Chapecó', 'Criciúma', 'Itajaí', 'Jaraguá do Sul', 'Palhoça', 'Lages', 'Balneário Camboriú'],
    'SP': ['Santos', 'São Paulo', 'Campinas', 'Guarulhos', 'São Bernardo do Campo', 'São José dos Campos', 'Santo André', 'Ribeirão Preto', 'Osasco', 'Sorocaba', 'Mauá', 'São José do Rio Preto', 'Mogi das Cruzes', 'Diadema', 'Jundiaí', 'Piracicaba', 'Carapicuíba', 'Bauru', 'São Vicente', 'Praia Grande', 'Guarujá', 'Taubaté', 'Limeira', 'Suzano', 'Barueri', 'Presidente Prudente'],
    'SE': ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'Estância', 'São Cristóvão'],
    'TO': ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins']
  };

  function carregarCidades(ufId, cidadeId, cidadePadrao) {
    var ufEl = document.getElementById(ufId);
    var cidadeEl = document.getElementById(cidadeId);
    if (!ufEl || !cidadeEl) return;

    var uf = ufEl.value;
    if (!uf) {
      cidadeEl.innerHTML = '<option value="">Selecione primeiro o Estado (UF)</option>';
      return;
    }

    cidadeEl.innerHTML = '<option value="">Carregando cidades...</option>';

    function preencherSelect(lista) {
      cidadeEl.innerHTML = '<option value="">Selecione a Cidade</option>';
      lista.forEach(function (nome) {
        var opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        if (cidadePadrao && (nome.toLowerCase() === cidadePadrao.toLowerCase())) {
          opt.selected = true;
        }
        cidadeEl.appendChild(opt);
      });
    }

    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/' + uf + '/municipios?orderBy=nome')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          var nomes = data.map(function (item) { return item.nome; });
          preencherSelect(nomes);
        } else {
          preencherSelect(cidadesPorEstado[uf] || ['Santos']);
        }
      })
      .catch(function () {
        preencherSelect(cidadesPorEstado[uf] || ['Santos']);
      });
  }

  function buscarCEP(targetTipo) {
    var prefix = targetTipo === 'empresa' ? 'emp-' : 'user-';
    var cepInput = document.getElementById(prefix + 'cep');
    if (!cepInput) return;

    var cepClean = cepInput.value.replace(/\D/g, '');
    if (cepClean.length !== 8) return;

    showCadToast('🔍 Buscando endereço pelo CEP...', 1500);

    fetch('https://viacep.com.br/ws/' + cepClean + '/json/')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.erro) {
          showCadToast('⚠ CEP não encontrado. Preencha o endereço manualmente.');
          return;
        }

        var logradouroBruto = (data.logradouro || '').trim();
        var tipos = ['Avenida', 'Alameda', 'Travessa', 'Praça', 'Rodovia', 'Estrada', 'Viela', 'Rua'];
        var tipoEncontrado = 'Rua';
        var nomeLogradouro = logradouroBruto;

        for (var i = 0; i < tipos.length; i++) {
          var t = tipos[i];
          if (logradouroBruto.toLowerCase().indexOf(t.toLowerCase()) === 0) {
            tipoEncontrado = t;
            nomeLogradouro = logradouroBruto.substring(t.length).trim();
            break;
          }
        }

        var tipoLogSelect = document.getElementById(prefix + 'tipo-logradouro');
        var logInput = document.getElementById(prefix + 'logradouro');
        var bairroInput = document.getElementById(prefix + 'bairro');
        var ufSelect = document.getElementById(prefix + 'uf');
        var numInput = document.getElementById(prefix + 'numero');

        if (tipoLogSelect) tipoLogSelect.value = tipoEncontrado;
        if (logInput) logInput.value = nomeLogradouro;
        if (bairroInput && data.bairro) bairroInput.value = data.bairro;

        if (ufSelect && data.uf) {
          ufSelect.value = data.uf;
          carregarCidades(prefix + 'uf', prefix + 'cidade', data.localidade);
        }

        if (numInput) {
          numInput.focus();
        }

        showCadToast('✓ Endereço localizado via CEP!');
      })
      .catch(function () {
        showCadToast('⚠ Não foi possível buscar o CEP automaticamente.');
      });
  }

  function irParaHome()  { window.showLoader('ecocall-home.html'); }
  function irParaLogin() { window.showLoader('ecocall-login.html', { delay: 1200 }); }

  function setType(t, el) {
    tipo = t;
    document.querySelectorAll('.type-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    el.classList.add('active');
    var lbl = document.getElementById('ps2lbl');
    if (lbl) lbl.textContent = t === 'empresa' ? 'Empresa' : 'Dados';
    goStep(1);
  }

  function goStep2() {
    var nome = (document.getElementById('user-nome') ? document.getElementById('user-nome').value.trim() : '');
    var em = (document.getElementById('email') ? document.getElementById('email').value.trim() : '');
    var p1 = (document.getElementById('pwd') ? document.getElementById('pwd').value : '');
    var p2 = (document.getElementById('pwd2') ? document.getElementById('pwd2').value : '');
    if (!nome)                     { showCadToast('⚠ Informe o seu nome.'); return; }
    if (!em || !em.includes('@')) { showCadToast('⚠ Informe um e-mail válido.'); return; }
    if (p1.length < 6)            { showCadToast('⚠ A senha deve ter no mínimo 6 caracteres.'); return; }
    if (p1 !== p2)                { showCadToast('⚠ As senhas não coincidem.'); return; }
    goStep(2);
  }

  function goStep2Empresa() {
    var nomeEmp = (document.getElementById('emp-nome') ? document.getElementById('emp-nome').value.trim() : '');
    var emailEmp = (document.getElementById('email-emp') ? document.getElementById('email-emp').value.trim() : '');
    var p1 = (document.getElementById('pwd-emp') ? document.getElementById('pwd-emp').value : '');
    var p2 = (document.getElementById('pwd-emp-2') ? document.getElementById('pwd-emp-2').value : '');

    if (!nomeEmp)                     { showCadToast('⚠ Informe o Nome do Responsável.'); return; }
    if (!emailEmp || !emailEmp.includes('@')) { showCadToast('⚠ Informe um e-mail corporativo válido.'); return; }
    if (p1.length < 6)            { showCadToast('⚠ A senha deve ter no mínimo 6 caracteres.'); return; }
    if (p1 !== p2)                { showCadToast('⚠ As senhas não coincidem.'); return; }
    goStep(2);
  }

  function goStep(n) {
    ['step1-user', 'step1-empresa', 'step2-user', 'step2-empresa', 'step3'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    ['ps1', 'ps2', 'ps3'].forEach(function (id, i) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active', 'done');
      if (i + 1 < n) el.classList.add('done');
      else if (i + 1 === n) el.classList.add('active');
    });
    ['pl1', 'pl2'].forEach(function (id, i) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle('done', i + 1 < n);
    });
    if (n === 1) document.getElementById('step1-' + tipo).classList.add('active');
    else if (n === 2) document.getElementById('step2-' + tipo).classList.add('active');
    else if (n === 3) {
      document.getElementById('step3').classList.add('active');
      showCadToast('✓ Cadastro realizado com sucesso!');
    }
  }

  function togglePwd(id, btn) {
    var inp = document.getElementById(id);
    if (!inp) return;
    var show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    var svg = btn.querySelector('svg');
    if (!svg) return;
    svg.innerHTML = show
      ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }

  function checkStr(v) {
    var colors = ['#e24b4b', '#f5a623', '#f5cc23', '#3ec96a'];
    var labels = ['Muito fraca', 'Fraca', 'Boa', 'Forte'];
    var s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    ['sb1', 'sb2', 'sb3', 'sb4'].forEach(function (id, i) {
      var el = document.getElementById(id);
      if (el) el.style.background = i < s ? colors[s - 1] : 'var(--gray-200)';
    });
    var lbl = document.getElementById('str-lbl');
    if (!lbl) return;
    lbl.textContent = v.length ? labels[Math.max(0, s - 1)] : 'Digite uma senha';
    lbl.style.color = v.length ? colors[Math.max(0, s - 1)] : 'var(--textl)';
  }

  function checkStrEmp(v) {
    var colors = ['#e24b4b', '#f5a623', '#f5cc23', '#3ec96a'];
    var labels = ['Muito fraca', 'Fraca', 'Boa', 'Forte'];
    var s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    ['esb1', 'esb2', 'esb3', 'esb4'].forEach(function (id, i) {
      var el = document.getElementById(id);
      if (el) el.style.background = i < s ? colors[s - 1] : 'var(--gray-200)';
    });
    var lbl = document.getElementById('estr-lbl');
    if (!lbl) return;
    lbl.textContent = v.length ? labels[Math.max(0, s - 1)] : 'Digite uma senha';
    lbl.style.color = v.length ? colors[Math.max(0, s - 1)] : 'var(--textl)';
  }

  function maskCPF(i)   { i.value = i.value.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
  function maskPhone(i) { i.value = i.value.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2'); }
  function maskCEP(i)   { i.value = i.value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2'); }
  function maskCNPJ(i)  { i.value = i.value.replace(/\D/g, '').slice(0, 14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2'); }

  function showCadToast(msg, dur) {
    if (window.toast) {
      window.toast(msg, dur);
    } else {
      var t = document.getElementById('toast');
      if (!t) return;
      var msgEl = document.getElementById('tmsg');
      if (msgEl) msgEl.textContent = msg;
      t.classList.add('on');
      setTimeout(function () { t.classList.remove('on'); }, dur || 3000);
    }
  }

  var redirectTarget = 'ecocall-dashbord_usuario.html';

  function irParaDashboard() {
    if (window.showLoader) {
      window.showLoader(redirectTarget);
    } else {
      window.location.href = redirectTarget;
    }
  }

  function submeterCadastro(targetTipo) {
    targetTipo = targetTipo || tipo;
    var payload = { tipo: targetTipo };

    if (targetTipo === 'user') {
      var nome = (document.getElementById('user-nome') ? document.getElementById('user-nome').value.trim() : '');
      var sobrenome = (document.getElementById('user-sobrenome') ? document.getElementById('user-sobrenome').value.trim() : '');
      var email = (document.getElementById('email') ? document.getElementById('email').value.trim() : '');
      var pwd = (document.getElementById('pwd') ? document.getElementById('pwd').value : '');
      var pwd2 = (document.getElementById('pwd2') ? document.getElementById('pwd2').value : '');
      var cpf = (document.getElementById('user-cpf') ? document.getElementById('user-cpf').value.trim() : '');
      var telefone = (document.getElementById('user-telefone') ? document.getElementById('user-telefone').value.trim() : '');
      var cep = (document.getElementById('user-cep') ? document.getElementById('user-cep').value.trim() : '');
      var tipoLogradouro = (document.getElementById('user-tipo-logradouro') ? document.getElementById('user-tipo-logradouro').value : 'Rua');
      var logradouro = (document.getElementById('user-logradouro') ? document.getElementById('user-logradouro').value.trim() : '');
      var numero = (document.getElementById('user-numero') ? document.getElementById('user-numero').value.trim() : '');
      var complemento = (document.getElementById('user-complemento') ? document.getElementById('user-complemento').value.trim() : '');
      var bairro = (document.getElementById('user-bairro') ? document.getElementById('user-bairro').value.trim() : '');
      var uf = (document.getElementById('user-uf') ? document.getElementById('user-uf').value : '');
      var cidade = (document.getElementById('user-cidade') ? document.getElementById('user-cidade').value.trim() : '');
      var termos = document.getElementById('t1');

      if (!nome) { showCadToast('⚠ Informe o seu nome.'); goStep(1); return; }
      if (!email || !email.includes('@')) { showCadToast('⚠ Informe um e-mail válido.'); goStep(1); return; }
      if (pwd.length < 6) { showCadToast('⚠ A senha deve ter no mínimo 6 caracteres.'); goStep(1); return; }
      if (pwd !== pwd2) { showCadToast('⚠ As senhas não coincidem.'); goStep(1); return; }
      if (cpf && cpf.replace(/\D/g, '').length !== 11) { showCadToast('⚠ O CPF deve conter 11 dígitos.'); return; }
      if (telefone && telefone.replace(/\D/g, '').length < 10) { showCadToast('⚠ Informe um número de telefone/WhatsApp válido.'); return; }
      if (termos && !termos.checked) { showCadToast('⚠ Você precisa aceitar os Termos de Uso e Política de Privacidade.'); return; }

      payload.nome = (nome + ' ' + sobrenome).trim();
      payload.email = email;
      payload.password = pwd;
      payload.cpf = cpf;
      payload.telefone = telefone;
      payload.cep = cep;
      payload.tipo_logradouro = tipoLogradouro;
      payload.logradouro = logradouro;
      payload.numero = numero;
      payload.complemento = complemento;
      payload.bairro = bairro;
      payload.uf = uf;
      payload.cidade = cidade;
    } else if (targetTipo === 'empresa') {
      var nomeEmp = (document.getElementById('emp-nome') ? document.getElementById('emp-nome').value.trim() : '');
      var razaoSocial = (document.getElementById('emp-razao') ? document.getElementById('emp-razao').value.trim() : '');
      var cnpj = (document.getElementById('emp-cnpj') ? document.getElementById('emp-cnpj').value.trim() : '');
      var emailEmp = (document.getElementById('email-emp') ? document.getElementById('email-emp').value.trim() : '');
      var telefoneEmp = (document.getElementById('emp-telefone') ? document.getElementById('emp-telefone').value.trim() : '');
      var cepEmp = (document.getElementById('emp-cep') ? document.getElementById('emp-cep').value.trim() : '');
      var tipoLogradouroEmp = (document.getElementById('emp-tipo-logradouro') ? document.getElementById('emp-tipo-logradouro').value : 'Rua');
      var logradouroEmp = (document.getElementById('emp-logradouro') ? document.getElementById('emp-logradouro').value.trim() : '');
      var numeroEmp = (document.getElementById('emp-numero') ? document.getElementById('emp-numero').value.trim() : '');
      var complementoEmp = (document.getElementById('emp-complemento') ? document.getElementById('emp-complemento').value.trim() : '');
      var bairroEmp = (document.getElementById('emp-bairro') ? document.getElementById('emp-bairro').value.trim() : '');
      var ufEmp = (document.getElementById('emp-uf') ? document.getElementById('emp-uf').value : 'SP');
      var cidadeEmp = (document.getElementById('emp-cidade') ? document.getElementById('emp-cidade').value.trim() : '');
      var categoriaEmp = (document.getElementById('emp-categoria') ? document.getElementById('emp-categoria').value : 'Reciclagem Geral');
      var pwdEmp = (document.getElementById('pwd-emp') ? document.getElementById('pwd-emp').value : '');
      var pwdEmp2 = (document.getElementById('pwd-emp-2') ? document.getElementById('pwd-emp-2').value : '');
      var termosEmp = document.getElementById('t-emp');

      if (!nomeEmp) { showCadToast('⚠ Informe o Nome do Responsável.'); goStep(1); return; }
      if (!emailEmp || !emailEmp.includes('@')) { showCadToast('⚠ Informe um e-mail corporativo válido.'); goStep(1); return; }
      if (pwdEmp.length < 6) { showCadToast('⚠ A senha deve ter no mínimo 6 caracteres.'); goStep(1); return; }
      if (pwdEmp !== pwdEmp2) { showCadToast('⚠ As senhas não coincidem.'); goStep(1); return; }
      if (!razaoSocial) { showCadToast('⚠ Informe a Razão Social da empresa.'); return; }
      if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) { showCadToast('⚠ Informe um CNPJ válido com 14 dígitos.'); return; }
      if (telefoneEmp && telefoneEmp.replace(/\D/g, '').length < 10) { showCadToast('⚠ Informe um número de telefone/WhatsApp válido.'); return; }
      if (termosEmp && !termosEmp.checked) { showCadToast('⚠ Você precisa aceitar os Termos e Condições de Parceria.'); return; }

      payload.nome = razaoSocial || nomeEmp;
      payload.razao_social = razaoSocial || nomeEmp;
      payload.cnpj = cnpj;
      payload.email = emailEmp;
      payload.password = pwdEmp;
      payload.telefone = telefoneEmp;
      payload.cep = cepEmp;
      payload.tipo_logradouro = tipoLogradouroEmp;
      payload.logradouro = logradouroEmp;
      payload.numero = numeroEmp;
      payload.complemento = complementoEmp;
      payload.bairro = bairroEmp;
      payload.uf = ufEmp;
      payload.cidade = cidadeEmp;
      payload.categoria = categoriaEmp;
    }

    var submitBtn = document.getElementById(targetTipo === 'empresa' ? 'btn-emp-submit' : 'btn-user-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Enviando...';
    }

    fetch('api/auth/register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(res) {
      return res.text().then(function(text) {
        var data;
        try {
          data = JSON.parse(text);
        } catch(e) {
          data = { error: text || 'Resposta inválida do servidor.' };
        }
        return { status: res.status, data: data };
      });
    })
    .then(function(resObj) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = targetTipo === 'empresa' ? 'Cadastrar Empresa →' : 'Criar conta →';
      }

      if (resObj.status >= 200 && resObj.status < 300 && resObj.data.success) {
        var isPending = resObj.data.pending_activation;
        var titleEl = document.querySelector('#step3 .success-title');
        var descEl = document.querySelector('#step3 .success-desc');
        var btnGo = document.getElementById('btn-go-dashboard');

        if (isPending) {
          if (titleEl) titleEl.innerHTML = 'Verificação de E-mail ✉️';
          if (descEl) {
            descEl.innerHTML = 'Cadastro realizado com sucesso!<br>Enviamos um link de ativação para <strong>' + (resObj.data.email || '') + '</strong>.<br><br>Acesse seu e-mail e clique no link para ativar sua conta e comprovar autenticidade.' +
              (resObj.data.link_ativacao ? '<div style="margin-top:1rem;padding:0.8rem;background:rgba(82,214,123,0.15);border:1px dashed #52d67b;border-radius:10px;font-size:0.84rem;text-align:left;"><strong>💡 Ambiente Local / Testes:</strong><br><a href="' + resObj.data.link_ativacao + '" style="color:#52d67b;font-weight:700;word-break:break-all;text-decoration:underline;">Clique aqui para Ativar a Conta Imediatamente 🔗</a></div>' : '');
          }
          if (btnGo) {
            btnGo.textContent = 'Ir para o Login →';
            btnGo.onclick = function () { irParaLogin(); };
          }
          goStep(3);
          showCadToast('✉️ Verifique seu e-mail para ativar sua conta!', 4000);
        } else {
          redirectTarget = resObj.data.redirect || (targetTipo === 'empresa' ? 'dashboard_empresa.html' : 'ecocall-dashbord_usuario.html');
          if (descEl) {
            descEl.textContent = 'Conta criada com sucesso! Seu usuário foi ativado e você já está autenticado no sistema. Redirecionando...';
          }
          goStep(3);
          showCadToast('✓ Cadastro realizado com sucesso! Entrando...', 2000);
          setTimeout(function() {
            irParaDashboard();
          }, 1200);
        }
      } else {
        showCadToast('⚠ ' + (resObj.data.error || 'Erro ao realizar cadastro.'));
      }
    })
    .catch(function(err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = targetTipo === 'empresa' ? 'Cadastrar Empresa →' : 'Criar conta →';
      }
      showCadToast('⚠ Falha na conexão com o servidor: ' + err.message);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    var empUf = document.getElementById('emp-uf');
    if (empUf) {
      empUf.addEventListener('change', function () {
        carregarCidades('emp-uf', 'emp-cidade');
      });
      carregarCidades('emp-uf', 'emp-cidade', 'Santos');
    }

    var userUf = document.getElementById('user-uf');
    if (userUf) {
      userUf.addEventListener('change', function () {
        carregarCidades('user-uf', 'user-cidade');
      });
      carregarCidades('user-uf', 'user-cidade', 'Santos');
    }

    // Atalhos de tecla Enter nos formulários para avançar e submeter
    var step1UserInps = document.querySelectorAll('#step1-user input');
    step1UserInps.forEach(function (inp) {
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); goStep2(); }
      });
    });

    var step1EmpInps = document.querySelectorAll('#step1-empresa input');
    step1EmpInps.forEach(function (inp) {
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); goStep2Empresa(); }
      });
    });

    var step2UserInps = document.querySelectorAll('#step2-user input');
    step2UserInps.forEach(function (inp) {
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submeterCadastro('user'); }
      });
    });

    var step2EmpInps = document.querySelectorAll('#step2-empresa input');
    step2EmpInps.forEach(function (inp) {
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submeterCadastro('empresa'); }
      });
    });
  });

  window.irParaHome = irParaHome;
  window.irParaLogin = irParaLogin;
  window.irParaDashboard = irParaDashboard;
  window.setType = setType;
  window.goStep = goStep;
  window.goStep2 = goStep2;
  window.goStep2Empresa = goStep2Empresa;
  window.submeterCadastro = submeterCadastro;
  window.togglePwd = togglePwd;
  window.checkStr = checkStr;
  window.checkStrEmp = checkStrEmp;
  window.maskCPF = maskCPF;
  window.maskPhone = maskPhone;
  window.maskCEP = maskCEP;
  window.maskCNPJ = maskCNPJ;
  window.toast = showCadToast;
  window.carregarCidades = carregarCidades;
  window.buscarCEP = buscarCEP;
})();
