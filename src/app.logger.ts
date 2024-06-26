import { Logger, PARAMS_PROVIDER_TOKEN, PinoLogger } from 'nestjs-pino';
import { Params } from 'nestjs-pino/params';
import { Inject } from '@nestjs/common';
import { Level } from 'pino';

export class AppLogger extends Logger {
  hideRoutes = false;
  hideDependencyInitialization = true;

  private readonly ourContextName: string;
  private readonly contextOverrides: { [key: string]: Level[] } = {
    MqttModule: ['error'],
    VXGService: ['error'],
    CamerasService: ['error'],
    EventLogic: ['error'],
  };

  constructor(
    protected readonly logger: PinoLogger,
    @Inject(PARAMS_PROVIDER_TOKEN) { renameContext }: Params,
  ) {
    super(logger, { renameContext });
    this.ourContextName = renameContext || 'context';

    if (this.hideRoutes) {
      this.contextOverrides = {
        ...this.contextOverrides,
        RouterExplorer: [],
        RoutesResolver: [],
      };
    }

    if (this.hideDependencyInitialization) {
      this.contextOverrides = {
        ...this.contextOverrides,
        InstanceLoader: [],
      };
    }
  }

  log(message: any, ...optionalParams: any[]) {
    this.filteredCall('info', message, ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.filteredCall('trace', message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.filteredCall('debug', message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.filteredCall('warn', message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.filteredCall('error', message, ...optionalParams);
  }

  private filteredCall(level: Level, message: any, ...optionalParams: any[]) {
    const objArg: Record<string, any> = {};
    let messageContext;

    // optionalParams contains extra params passed to logger
    // context name is the last item
    let params: any[] = [];
    if (optionalParams.length !== 0) {
      messageContext = optionalParams[optionalParams.length - 1];

      objArg[this.ourContextName] = messageContext;
      params = optionalParams.slice(0, -1);
    }

    if (!!messageContext) {
      const override = this.contextOverrides[messageContext];

      if (!!override && !override.includes(level)) return;
    }

    if (typeof message === 'object') {
      if (message instanceof Error) {
        objArg.err = message;
      } else {
        Object.assign(objArg, message);
      }
      this.logger[level](objArg, ...params);
    } else if (
      this.ourIsWrongExceptionsHandlerContract(level, message, params)
    ) {
      objArg.err = new Error(message);
      objArg.err.stack = params[0];
      this.logger[level](objArg);
    } else {
      this.logger[level](objArg, message, ...params);
    }
  }

  /**
   * Unfortunately built-in (not only) `^.*Exception(s?)Handler$` classes call `.error`
   * method with not supported contract:
   *
   * - ExceptionsHandler
   * @see https://github.com/nestjs/nest/blob/35baf7a077bb972469097c5fea2f184b7babadfc/packages/core/exceptions/base-exception-filter.ts#L60-L63
   *
   * - ExceptionHandler
   * @see https://github.com/nestjs/nest/blob/99ee3fd99341bcddfa408d1604050a9571b19bc9/packages/core/errors/exception-handler.ts#L9
   *
   * - WsExceptionsHandler
   * @see https://github.com/nestjs/nest/blob/9d0551ff25c5085703bcebfa7ff3b6952869e794/packages/websockets/exceptions/base-ws-exception-filter.ts#L47-L50
   *
   * - RpcExceptionsHandler @see https://github.com/nestjs/nest/blob/9d0551ff25c5085703bcebfa7ff3b6952869e794/packages/microservices/exceptions/base-rpc-exception-filter.ts#L26-L30
   *
   * - all of them
   * @see https://github.com/search?l=TypeScript&q=org%3Anestjs+logger+error+stack&type=Code
   */
  private ourIsWrongExceptionsHandlerContract(
    level: Level,
    message: any,
    params: any[],
  ): params is [string] {
    return (
      level === 'error' &&
      typeof message === 'string' &&
      params.length === 1 &&
      typeof params[0] === 'string' &&
      /\n\s*at /.test(params[0])
    );
  }
}
