import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';

@Injectable()
export class UserGuard implements CanActivate {
  private logger = new Logger('UsersGuard');

  constructor() {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    let result: Promise<boolean> | boolean = false;
    if (this.isClientRequest(request)) {
      this.handleClientRequest(request);

      if (this.isUserRequest(request)) {
        this.logger.log('[canActivate]->Handling user request');
        result = this.handleUserRequest(request);
      } else if (
        this.isTowersRequest(request) ||
        this.isSitesRequest(request)
      ) {
        this.logger.log('[canActivate]->Handling own towers/sites request');
        result = true;
      }

      if (this.isDemoRequest(request) && result) {
        this.logger.log('[canActivate]->Handling demo request');
        result = this.handleDemoRequest(request);
      }
    }

    return result;
  }

  /**
   * Checks if there is a user associated with the request
   * @param request
   */
  isClientRequest(request: any) {
    return request.hasOwnProperty('user') && request['user'];
  }

  /**
   * Check if we're accessing a user's details
   * @param request
   */
  isUserRequest(request: any) {
    const params = request.params;
    return params.hasOwnProperty('userID') && params['userID'];
  }

  /**
   * Check if we're accessing a tower's details
   * @param request
   */
  isTowerRequest(request: any) {
    const params = request.params;
    return params.hasOwnProperty('towerSerial') && params['towerSerial'];
  }

  /**
   * Check if client is getting their list of towers
   * @param request
   */
  isTowersRequest(request: any) {
    return request.url === '/client/towers/';
  }

  /**
   * Check if client is getting their list of sites
   * @param request
   */
  isSitesRequest(request: any) {
    return request.url === '/client/sites/';
  }

  /**
   * Is request method DELETE
   * @param request
   */
  isDestructiveRequest(request: any) {
    return request.method === 'DELETE';
  }

  /**
   * Is request method PUT/PATCH/POST
   * @param request
   */
  isModifyingRequest(request: any) {
    return ['PUT', 'PATCH', 'POST'].includes(request.method);
  }

  /**
   * Check if user ID contains 'demo'
   * @param request
   */
  isDemoRequest(request: any) {
    return request.userID.includes('demo');
  }

  /**
   * Check if we're accessing a camera's details
   * @param request
   */
  isCameraRequest(request: any) {
    const params = request.params;
    return request.params.hasOwnProperty('cameraID') && params['cameraID'];
  }

  /**
   * Check if we're accessing a site's details
   * @param request
   */
  isSiteRequest(request: any) {
    const params = request.params;
    return request.params.hasOwnProperty('siteID') && params['siteID'];
  }

  /**
   * Handle a client request like a boss
   * @param request
   */
  handleClientRequest(request: any) {
    const user = request['user'] as { sub: string; email: string };
    request.userID = user.sub;
    request.isClientRequest = true;
    request.user.demo = user.sub.includes('demo');
  }

  /**
   * Logic for user accessing user's information
   * @param request
   */
  handleUserRequest(request: any) {
    const params = request.params;
    const userID = params['userID'];

    if (!!request.userID) return request.userID === userID;
    return false;
  }

  /**
   * Handle a demo request
   * @param request
   */
  handleDemoRequest(request: any) {
    request.demo = true;
    return (
      !this.isDestructiveRequest(request) && !this.isModifyingRequest(request)
    );
  }
}
