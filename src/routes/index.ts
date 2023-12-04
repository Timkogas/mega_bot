import * as core from 'express-serve-static-core';
import EjsScanRoute from './ejs/ejsScan';
import EjsLeaderboardRoute from './ejs/ejsLeaderboard';
import EjsAdminStatsAll from './ejs/EjsAdminStatsAll';
import UserWebAppCount from './user/userWebAppCount';
import ScanCheck from './scan/scanCheck';
import UserPlaceInLeaderBoard from './user/userPlaceInLeaderBoard';
import EjsAdminStatsPlatforms from './ejs/EjsAdminStatsPlatforms';
import EjsAdminStatsResults from './ejs/EjsAdminStatsResults';
import EjsAdminStatsDetail from './ejs/EjsAdminStatsDetail';
import EjsAdminStatsProblems from './ejs/EjsAdminStatsProblems';
import EjsAdminStatsSend from './ejs/EjsAdminStatsSend';


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
    new EjsAdminStatsAll(this._app)
    new EjsAdminStatsPlatforms(this._app)
    new EjsAdminStatsResults(this._app)
    new EjsAdminStatsDetail(this._app)
    new EjsAdminStatsProblems(this._app)
    new EjsAdminStatsSend(this._app)
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