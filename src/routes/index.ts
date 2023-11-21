import * as core from 'express-serve-static-core';
import EjsScanRoute from './ejs/ejsScan';
import EjsLeaderboardRoute from './ejs/ejsLeaderboard';
import EjsAdminStats from './ejs/ejsAdminStats';


class Routes {

  constructor(app: core.Express) {
    this._app = app;
    this._init();
  }

  private _app: core.Express;

  private _init(): void {
    this._ejsRoutes();
  }

  private _ejsRoutes(): void {
    new EjsScanRoute(this._app)
    new EjsLeaderboardRoute(this._app)
    new EjsAdminStats(this._app)
  }

}

export default Routes