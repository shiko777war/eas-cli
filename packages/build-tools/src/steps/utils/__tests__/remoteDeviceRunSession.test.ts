import { bunyan } from '@expo/logger';
import { BuildStepEnv } from '@expo/steps';

import { getServeSimTurnArgs } from '../remoteDeviceRunSession';

function createLoggerMock(): bunyan {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as bunyan;
}

describe(getServeSimTurnArgs, () => {
  it('returns no args when EAS_SIMULATOR_TURN_ICE_SERVERS is unset', () => {
    expect(getServeSimTurnArgs({} as BuildStepEnv, createLoggerMock())).toEqual([]);
  });

  it('builds --stun-url and --turn-url flags from Cloudflare ICE servers', () => {
    const env = {
      EAS_SIMULATOR_TURN_ICE_SERVERS: JSON.stringify([
        { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
        {
          urls: [
            'turn:turn.cloudflare.com:3478?transport=udp',
            'turns:turn.cloudflare.com:443?transport=tcp',
          ],
          username: 'user-123',
          credential: 'cred-456',
        },
      ]),
    } as BuildStepEnv;

    expect(getServeSimTurnArgs(env, createLoggerMock())).toEqual([
      '--stun-url',
      'stun:stun.cloudflare.com:3478,stun:stun.cloudflare.com:53',
      '--turn-url',
      'turn:turn.cloudflare.com:3478?transport=udp,turns:turn.cloudflare.com:443?transport=tcp',
      '--turn-username',
      'user-123',
      '--turn-credential',
      'cred-456',
    ]);
  });

  it('emits only --turn-url flags when no credential-less (STUN) entry is present', () => {
    const env = {
      EAS_SIMULATOR_TURN_ICE_SERVERS: JSON.stringify([
        {
          urls: ['turns:turn.cloudflare.com:443?transport=tcp'],
          username: 'u',
          credential: 'c',
        },
      ]),
    } as BuildStepEnv;

    expect(getServeSimTurnArgs(env, createLoggerMock())).toEqual([
      '--turn-url',
      'turns:turn.cloudflare.com:443?transport=tcp',
      '--turn-username',
      'u',
      '--turn-credential',
      'c',
    ]);
  });

  it('returns no args and warns when the value is malformed JSON', () => {
    const logger = createLoggerMock();
    expect(
      getServeSimTurnArgs(
        { EAS_SIMULATOR_TURN_ICE_SERVERS: 'not-json' } as BuildStepEnv,
        logger
      )
    ).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns no args and warns when the value has the wrong shape', () => {
    const logger = createLoggerMock();
    expect(
      getServeSimTurnArgs(
        { EAS_SIMULATOR_TURN_ICE_SERVERS: JSON.stringify({ nope: true }) } as BuildStepEnv,
        logger
      )
    ).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });
});
