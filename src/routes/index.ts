import * as core from 'express-serve-static-core';
import EjsScanRoute from './ejs/ejsScan';
import EjsLeaderboardRoute from './ejs/ejsLeaderboard';
import EjsAdminStats from './ejs/ejsAdminStats';
import UserWebAppCount from './user/userWebAppCount';
import ScanCheck from './scan/scanCheck';
import UserPlaceInLeaderBoard from './user/userPlaceInLeaderBoard';


class Routes {

  constructor(app: core.Express) {
    this._app = app;
    this._init();
  }

  private _app: core.Express;

  private _init(): void {
    this._ejsRoutes();
    this._userRoutes()
    this._scanRoutes()
  }

  private _ejsRoutes(): void {
    new EjsScanRoute(this._app)
    new EjsLeaderboardRoute(this._app)
    new EjsAdminStats(this._app)
  }

  private _userRoutes(): void {
    new UserWebAppCount(this._app)
    new UserPlaceInLeaderBoard(this._app)
  }

  private _scanRoutes(): void {
    new ScanCheck(this._app)
  }


}

export default Routes