const express = require('express');
const Campsite = require('../models/campsite');
const authenticate = require('../authenticate');
const user = require('../models/user');

const campsiteRouter = express.Router();

campsiteRouter.route('/')
.get((req, res, next) => {
    Campsite.find()
    .populate('comments.author')
    .then(campsites => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsites);
    })
    .catch(err => next(err));
})
.post(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.create(req.body)
    .then(campsite => {
        console.log('Campsite Created', campsite);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
.put(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /campsites');
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.deleteMany()
    .then(response => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    })
    .catch(err => next(err));
});

campsiteRouter.route('/:campsiteId')
.get((req, res) => {
    Campsite.findById(req.params.campsiteId)
    .populate('comments.author')
    .then(campsite => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
.post(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end(`POST operation not supported on /campsites/${req.params.campsiteId}`);
})
.put(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.findByIdAndUpdate(req.params.campsiteId, {
        $set: req.body
    }, { new: true })
    .then(campsite => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res) => {
    Campsite.findByIdAndDelete(req.params.campsiteId)
    .then(campsite => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
});

campsiteRouter.route('/:campsiteId/comments')
.get((req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .populate('comments.author')
    .then(campsite => {
        if (campsite) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(campsite.comments);
        } else {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
.post(authenticate.verifyUser, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        if (campsite) {
            req.body.author = req.user._id;
            campsite.comments.push(req.body);
            campsite.save()
            .then(campsite => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.join(campsite);
            })
            .catch(err => next(err));
        } else {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
.put(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end(`PUT operation not supported on /campsites/${req.params.campsiteId}/comments`);
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        if (campsite) {
            for (let i = (campsite.comments.length-1); i>= 0; i--) {
                campsite.comments.id(campsite.comments[i]._id).remove();
            }
            campsite.save()
            .then(campsite => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.join(campsite);
            })
        } else {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
});

campsiteRouter.route('/:campsiteId/comments/:commentId')
.get((req, res) => {
    Campsite.findById(req.params.campsiteId)
    .populate('comments.author')
    .then(campsite => {
       if (campsite && campsite.comments.id(req.params.commentId)) {
           res.statusCode = 200;
           res.setHeader('Content-Type', 'applilcation/json');
           res.json(campsite.comments.id(req.params.commentId));
       } else if(!campsite) {
           err = new Error(`Campsite ${req.params.campsiteId} not found`);
           err.status = 404;
           return next(err);
       } else {
           err = new Error(`Comment ${req.params.commentId} not found`);
           err.statur = 404;
           return next(err);
       }
    })
    .catch(err => next(err));
})
.post(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end(`POST operation not supported on /campsites/${req.params.campsiteId}/comments/${req.params.commentId}`);
})
.put(authenticate.verifyUser, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        const theComment = campsite.comments.id(req.params.commentId);
        if (campsite && theComment) {
            if (req.user._id.equals(theComment.author._id)) {
                if (req.body.rating) {
                    theComment.rating = req.body.rating;
                }
                if (res.body.text) {
                    theComment.text = req.body.text;
                }
                campsite.save()
                .then(campsite => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(campsite);
                })
                .catch(err => next(err));
            } else {
                const err = new Error('You cannot modify because you are not the author');
                err.status = 403;
                return next(err);
            }
       } else if(!campsite) {
           err = new Error(`Campsite ${req.params.campsiteId} not found`);
           err.status = 404;
           return next(err);
       } else {
           err = new Error(`Comment ${req.params.commentId} not found`);
           err.statur = 404;
           return next(err);
       }
    })
    .catch(err => next(err));
})
.delete(authenticate.verifyUser, (req, res) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        const theComment = campsite.comments.id(req.params.commentId);
        if (campsite && theComment) {
            if (req.user._id.equals(theComment.author._id)) {
                theComment.remove();
                campsite.save()
                .then(campsite => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(campsite);
                })
                .catch(err => next(err));
            } else {
                const err = new Error('You cannot modify because you are not the author');
                err.status = 403;
                return next(err);
            }
        } else if(!campsite) {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        } else {
            err = new Error(`Comment ${req.params.commentId} not found`);
            err.statur = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
});

module.exports = campsiteRouter;