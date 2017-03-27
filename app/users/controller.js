/**
* This is the users controller. A Controller module is a single "module" export which exports a single object which
* may be instantiated with *new* and inheriting the Controller base class.
* Controller define the routes which handle the interaction between requests & api.
*/
const inherits = require('../core/Controller.js').inherits
const debug = require('debug')('ds.users.controller')
const multiparty = require('multiparty')
const validator = require('validator')
const express = require('express')
const path = require('path')
const fs = require('fs')

debug('loaded')

const AccountEmailUpdateError = defineError(
  'Invalid address', 
  'The email you\'ve entered is empty or invalid.', {
  status: 406, // not acceptable
})

const AccountNameUpdateError = defineError(
  'Invalid username', 
  'The username you\'ve entered is empty or invalid.', {
  status: 406, // not acceptable
})

AccountImageFormOptions = {
	maxFields: 1,
	autoFiles: true,
	maxFilesSize: 200000,
	uploadDir: global.config.userdir_images
};

module.exports = UserController

function UserController(app) {
  UserController.super_.call(this, app)
	
  this
		.get('/users/login', (req, res) => res.render('user/login/login.pug'))
    .get('/users/register', (req, res) => res.render('user/login/register.pug'))
    .get('/users/settings', (req, res) => res.render('user/settings/'))
		.post('/users/login', this.login)
		.post('/users/login/json', this.login)
		.post('/users/register', this.register)
		.post('/users/register/json', this.register)
		.post('/users/logout', this.logout)
		.post('/users/settings/image', this.updateImage)
		.post('/users/settings/profile', this.updateProfile)
		.use('/users/data/image', express.static(global.config.userdir_images))
}
inherits(UserController)

UserController.prototype.updateImage = function(req, res, next) {
	debug('attempting to update user image')

	var form = new multiparty.Form(AccountImageFormOptions)
	form.parse(req, (e, fields, files) => {
		if(e) return next(e)
		
		var image = files.image[0]
		if(image) {

			filepath = path.format({
				dir: path.dirname(image.path),
				name: res.locals.user.name,
				ext: path.extname(image.path)
			})
			
			fs.rename(image.path, filepath, e => {
				if(e) return next(e)
				res.locals.user.image_name = path.basename(filepath)
				res.locals.user.save().then(() => {
					res.redirect('/users/settings')
				}).catch(next)
			})
			
		} else {
			res.redirect('/users/settings')
		}
	})
}

UserController.prototype.updateProfile = function(req, res, next) {
	debug('attempting to update profile', req.body)
	
	const data = req.body || {};
	const email = data.email;
	const name = data.name;

	var changed = false;

	if(email && email.length) {
		if(!validator.isEmail(email)) {
			return next(AccountEmailUpdateError)
		} else {
			res.locals.user.email = email;
			changed = true;
		}
	}

	// TODO: this should be enforced in the schema
	if(name && name.length) {
		if(name.length < 3 || !name.match(/[a-zA-Z][a-zA-Z0-9-_. ]{2,}/)) {
			return next(AccountNameUpdateError)
		} else {
			res.locals.user.name = name
			changed = true;
		}
	}

	if(changed) {
		res.locals.user.save().then(() => {
			res.redirect('/users/settings')
		}).catch(next)
	} else {
		res.redirect('/users/settings')
	}
}

UserController.prototype.login = function(req, res, next) {
  debug('attempting login', req.body)

	if(res.locals.session) {
		return res.json({ action: '/users/login', result: 0 })
	}

	this.api.users.login(req.body).then(user => {
		debug('login for %s success', user.name)

	 	// sets cookie
		req.session.user = user.public()

		if(req.json) {
			res.json({ action:'/users/login', result:1 })
		} else {
			res.redirect('/')
		}
	}).catch(next)
};

UserController.prototype.register = function(req, res, next) {
	debug('attempting register for "%s"', req.body.email)

	if(res.locals.session) {
		return res.json({ action: '/users/register', result: 0 })
	}

	this.api.users.register(req.body).then(user => {

		// sets cookie
		req.session.user = user.public()

		if(req.json) {
			res.json({ action: '/users/register', result:1 })
		} else {
			res.redirect('/')
		}
	}).catch(next)
}

UserController.prototype.logout = function(req, res, next) {
	debug('attempting logout', req.body)

	var user = res.locals.user

	this.api.users.logout(req.body, res.locals.user).then(may_logout => {
		
		if(may_logout)
			delete req.session.user

		if(req.json) {
			res.json({ action: '/users/logout', result: (may_logout ? 1: 0) })
		} else {
			res.redirect('/')
		}
	}).catch(next)
}