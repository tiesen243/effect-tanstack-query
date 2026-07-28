import { tegami } from 'tegami'
import { runCli } from 'tegami/cli'
import { github } from 'tegami/plugins/github'

const paper = tegami({
  npm: {
    client: 'bun',
    updateLockFile: true,
    onBreakPeerDep: 'set',
  },

  plugins: [
    github({
      repo: 'tiesen243/effect-tanstack-query',
      versionPr: {
        base: 'main',
      },
    }),
  ],
})

// oxlint-disable-next-line node/no-top-level-await
await runCli(paper)
