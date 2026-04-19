import { copyFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const assets = [
  {
    src: 'src/main/scraper/ligaCollectionMap.json',
    dest: 'dist-electron/main/ligaCollectionMap.json',
  },
]

for (const { src, dest } of assets) {
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)
  console.log(`Copied: ${src} → ${dest}`)
}
