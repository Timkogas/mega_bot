import * as core from 'express-serve-static-core';
import EjsCheckRoute from './ejs/ejsCheck';


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
    new EjsCheckRoute(this._app)
  }

}

export default Routes