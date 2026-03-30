# Contexto do Projeto

<!-- 
  Este arquivo é lido automaticamente pelo CMT em toda tarefa.
  Descreva seu projeto aqui. Quanto mais claro, melhor o resultado.
  Atualize sempre que o projeto evoluir.
-->

## Nome do projeto
CMT 1.0

## Descrição
Workflow multi-agent de inteligência artificial construído em TypeScript usando a Anthropic API.

## Stack principal
- TypeScript 5.5 + Node.js 18
- Anthropic SDK (@anthropic-ai/sdk)
- Zod para validação de schemas

## Estrutura
- /agents — os 7 agentes do workflow
- /skills — funções especializadas de cada agente
- /config — configurações, limites e cache de modelos
- /types  — tipos TypeScript globais
- /utils  — wrapper da API, logger e compilador
- /cli    — ponto de entrada do comando cmt

## Padrões adotados
- Sem uso de "any" — sempre tipar corretamente
- Funções com tipos de retorno explícitos
- Async/await — sem callbacks aninhados
- Tratamento de erro com try/catch tipado
- Cada agente recebe apenas o contexto mínimo necessário

## O que NÃO fazer
- Não modificar types/index.ts sem atualizar todos os agentes
- Não acionar o Pensador para tarefas simples
- Não expor a ANTHROPIC_API_KEY em nenhum arquivo
- Não commitar o arquivo .env

## Projetos que usam o CMT
- AVOX (SaaS de gestão de ativos fixos — Spring Boot 3.2 + Java 17 + React 18 + TypeScript + MUI 5)

## Observações
- Atualizar este arquivo sempre que mudar a stack ou adicionar um novo projeto