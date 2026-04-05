# Bento Agents — Releases

## Estrutura

```
releases/
  latest/       ← VSIX da versão mais recente (bento-agents-X.Y.Z.vsix)
  archive/      ← Versões anteriores para referência
```

## Como publicar uma nova versão

1. Build: `npm run package`
2. Empacote o VSIX (veja instruções no CLAUDE.md)
3. Mova o VSIX anterior de `latest/` para `archive/`
4. Coloque o novo VSIX em `latest/`
5. Crie uma tag git: `git tag vX.Y.Z && git push origin vX.Y.Z`

## Versões

| Versão | Data | Notas |
|--------|------|-------|
| v1.5.0 | 2026-04-05 | Advanced idle behaviors, performance cap, AudioManager, strike effects, and UI unification |
| v1.4.1 | 2026-04-02 | Rebrand para Bento Agents, sala datacenter, detecção de servidores |
