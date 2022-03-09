import freeport from 'freeport-promise'
import fetch from 'node-fetch'
import path from 'path'
import rmfr from 'rmfr'
import {
  sendDelta,
  serverTestConfigDirectory,
  startServerP,
  WsPromiser
} from './servertestutilities'

const emptyConfigDirectory = () =>
  Promise.all(
    ['serverstate/course', 'resources', 'plugin-config-data', 'baseDeltas.json']
      .map(subDir => path.join(serverTestConfigDirectory(), subDir))
      .map(dir => rmfr(dir).then(() => console.error(dir)))
  )

export const startServer = async () => {
  const port = await freeport()
  const host = 'http://localhost:' + port
  const sendDeltaUrl = host + '/signalk/v1/api/_test/delta'
  const api = host + '/signalk/v2/api'

  await emptyConfigDirectory()
  const server = await startServerP(port, false, {
    settings: {
      interfaces: {
        plugins: true
      }
    }
  })
  return {
    createWsPromiser: () =>
      new WsPromiser(
        'ws://localhost:' +
          port +
          '/signalk/v1/stream?subscribe=self&metaDeltas=none&sendCachedValues=false'
      ),
    selfPut: (path: string, body: object) =>
      fetch(`${api}/vessels/self/${path}`, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      }),
    selfDelete: (path: string) =>
      fetch(`${api}/vessels/self/${path}`, {
        method: 'DELETE'
      }),
    get: (path: string) => fetch(`${api}${path}`),
    post: (path: string, body: object) =>
      fetch(`${api}${path}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      }),
    put: (path: string, body: object) =>
      fetch(`${api}${path}`, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      }),
    selfGetJson: (path: string) =>
      fetch(`${api}/vessels/self/${path}`).then(r => r.json()),
    sendDelta: (path: string, value: any) =>
      sendDelta(
        {
          updates: [
            {
              values: [
                {
                  path,
                  value
                }
              ]
            }
          ]
        },
        sendDeltaUrl
      ),
    stop: () => server.stop()
  }
}

export const deltaHasPathValue = (delta: any, path: string, value: any) =>
  delta.updates[0].values
    .find((x: any) => x.path === path)
    .value.should.deep.equal(value)