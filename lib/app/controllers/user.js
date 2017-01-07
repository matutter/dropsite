const inherits = require('./Controller.js').inherits
const sessions = require('client-sessions')
const debug = require('debug')('user')

module.exports = UserController

function UserController(app) {
  UserController.super_.call(this, app)

	var user_sessions = sessions({
		cookieName: 'user_session',
		secret: 'secret123',
		duration: 24 * 60 * 60 * 1000,
		activeDuration: 1000 * 60 * 5
	})

	this.use(user_sessions)
	
  this.post('/user/login', this.login)
		.post('/user/register', this.register)
		.get('/user/login', (req, res) => res.render('user/login.pug'))
    .get('/user/register', (req, res) => res.render('user/register.pug'))
}
inherits(UserController)

UserController.prototype.login = function(req, res, next) {
  debug('attempting login', req.body)
	
	this.api.users.login(req.body).then(user => {
		res.redirect('/')
	}).catch(next)
};

UserController.prototype.register = function(req, res, next) {
	debug('attempting register', req.body)
	
	this.api.users.register(req.body).then(user => {
		debug('success')
		res.redirect('/')
	}).catch(next)
}