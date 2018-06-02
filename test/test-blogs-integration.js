'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const { BlogPost } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
    console.info('seeding blog data');
    const seedData = [];

    for (let i = 1; i <= 10; i++) {
        seedData.push(generateBlogData());
    }
    // this will return a promise
    return BlogPost.insertMany(seedData);
}

function generateFirstName() {
    const firstNames = ['Jim', 'Bob', 'John'];
    return firstNames[Math.floor(Math.random() * firstNames.length)];
}
function generateLastName() {
    const lastNames = ['Smith', 'Miller', 'Shrute', 'Gold'];
    return lastNames[Math.floor(Math.random() * lastNames.length)];
}

function generateBlogData() {
    return {
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraph(),
        author: {
            firstName: generateFirstName(),
            lastName: generateLastName()
        }
    }
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blogs API Resource', function () {
    before(function () {
        return runServer(TEST_DATABASE_URL);
    });
    beforeEach(function () {
        return seedBlogData();
    });

    afterEach(function () {
        return tearDownDb();
    });

    after(function () {
        return closeServer();
    });

    describe('GET endpoint', function () {
        it('should return with all blogs', function () {
            let res;
            return chai.request(app)
                .get('/posts')
                .then(function (_res) {
                    res = _res;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.lengthOf.at.least(1);
                    return BlogPost.count();
                })
                .then(function (count) {
                    expect(res.body).to.have.lengthOf(count);
                })

        })
        it('should contain the expected fields', function () {
            let resBlog;
            return chai.request(app)
                .get('/posts')
                .then(function (res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.have.lengthOf.at.least(1);
                    expect(res.body).to.be.a('array');

                    res.body.forEach(function (blog) {
                        expect(blog).to.be.a('object');
                        expect(blog).to.include.keys(
                            'id', 'title', 'content', 'author', 'created'
                        );
                    });

                })
        })
    });

    describe('PUT', function() {
        it('Should update an existing blog', function() {
            const updateData = {
                title: 'Jims Update',
                content: 'Content',
                author: {
                    firstName: 'Jim',
                    lastName: 'Bishop'
                }
            };
            return BlogPost
            .findOne()
            .then(function(post) {
                updateData.id = post.id;
                return chai.request(app)
                .put(`/posts/${post.id}`)
                .send(updateData)
            })
            .then(function(res) {
                expect(res).to.have.status(204);
                return BlogPost.findById(updateData.id);
            })
            .then(function (post) {
                expect(post.title).to.equal(updateData.title);
                expect(post.content).to.equal(updateData.content);
                //FOLLOW UP
                //expect(post.author).to.equal(`${updateData.author.firstName} ${updateData.author.lastName}`)
            })
        });
    });

    describe('POST', function () {
        it('Should add a new blog post', function () {
            const newBlog = generateBlogData();

            return chai.request(app)
                .post('/posts')
                .send(newBlog)
                .then(function (res) {
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res).to.be.a('object');
                    expect(res.body).to.include.keys(
                        'id', 'title', 'content', 'created'
                    );
                    expect(res.body.id).to.not.be.null;
                    expect(res.body.title).to.equal(newBlog.title);
                    expect(res.body.content).to.equal(newBlog.content);
                    //FOLLOW UP
                    expect(res.body.created).to.not.be.null;
                    //expect(res.body.author).to.equal(newBlog.author);
                    //expect(res.body).to.deep.equal(Object.assign(newBlog, { id: res.body.id, author: res.body.author }));
                    //FOLLOW UP
                })
        });
    });

    describe('DELETE API endpoint', function () {
        it('should remove a blog post', function () {
            let post;

            return BlogPost
                .findOne()
                .then(function (_post) {
                    post = _post;
                    return chai.request(app).delete(`/posts/${post.id}`);
                })
                .then(function (res) {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(post.id);
                })
                .then(function (_post) {
                    expect(_post).to.be.null;
                })
        })
    });

});