"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
    commonAfterAll,
    commonAfterEach,
    commonBeforeAll,
    commonBeforeEach,
    u1Token,
    u2Token,
    jobIds
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

// Post

describe("POST /jobs", function () {
    const newJob = {
        title: "new",
        salary: 100000,
        equity: 0.45,
        company_handle: "c1"
    };

    test("ok for admin", async function () {
        const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
        
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            job: {
                id: expect.any(Number),
                companyHandle: "c1",
                equity: "0.45",
                salary: 100000,
                title: "new"
            }
        });
    });

    test("bad request with missing data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                title: "job",
                salary: 100
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toBe(400);
    });

    test("bad request with invalid data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                companyHandle: "c2",
                equity: "Not a number",
                salary: "not a number",
                title: "job"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toBe(400);
    });

    test("not allowed if non-admin", async function () {
        const resp = await request(app).post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toBe(401);
    })
});

// Get /jobs 

describe("GET /jobs", function () {
    test("ok for anon", async function () {
        const resp = await request(app).get("/jobs");
        expect(resp.body).toEqual({
            jobs:
            [
                {
                    id: jobIds[0],
                    title: "j1",
                    salary: 111,
                    equity: "0.1",
                    companyHandle: "c1"
                },
                {
                    id: jobIds[1],
                    title: "j2",
                    salary: 222,
                    equity: "0.2",
                    companyHandle: "c2"
                },
                {
                    id: jobIds[2],
                    title: "j3",
                    salary: 333,
                    equity: "0.3",
                    companyHandle: "c3"
                },
            ]
        });
    });

    test("fails: test next() handler", async function () {
    
        await db.query("DROP TABLE jobs CASCADE");
        const resp = await request(app)
            .get("/jobs")
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(500);
      }); 
});

// get /jobs/:id

describe("GET /jobs/:id", function() {
    test("works for anon", async function() {
        const resp = await request(app).get(`/jobs/${jobIds[0]}`);
        expect(resp.body).toEqual({
            job: {
                id: jobIds[0],
                title: "j1",
                salary: 111,
                equity: "0.1",
                companyHandle: "c1"
            },
        })
    });

    test("not found for no such job", async function () {
        const resp = await request(app).get(`/jobs/2345567`);
        expect(resp.statusCode).toEqual(404);
    });
});

// Patch Jobs/:id

describe("PATCH /jobs/:id", function () {
    test("works for admin", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobIds[0]}`)
            .send({
                title: "New title job"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.body).toEqual({
            job: {
                id: jobIds[0],
                title: "New title job",
                salary: 111,
                equity: "0.1",
                companyHandle: "c1"
            }
        });
    });

    test("unauth for anon", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobIds[0]}`)
            .send({
                title: "New title job"
            });
        expect(resp.statusCode).toEqual(401);
    });

    test("not found for no such job", async function () {
        const resp = await request(app)
            .patch(`/jobs/2300`)
            .send({
                title: "won't be valid"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(404);
    });

    test("Bad request on id change attempt", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobIds[0]}`)
            .send({
                id: 23235
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("Bad request on company_handle change attempt", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobIds[0]}`)
            .send({
                company_handle: "c3"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("Bad request on invalid data", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobIds[0]}`)
            .send({
                salary: "blah"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("Unauth for non-admin", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobIds[0]}`)
            .send({
                title: "New title job"
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(401);
    });    
});

// Delete /jobs/:id

describe("DELETE /jobs/:id", function () {
    test("works for admin", async function () {
        const resp = await request(app)
            .delete(`/jobs/${jobIds[2]}`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.body).toEqual({ deleted: `${jobIds[2]}`});
    });

    test("unauth for anon", async function () {
        const resp = await request(app)
            .delete(`/jobs/${jobIds[2]}`)
        expect(resp.statusCode).toEqual(401);
    });

    test("unauth for non-admin", async function () {
        const resp = await request(app)
            .delete(`/jobs/${jobIds[2]}`)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("not found for no such job", async function () {
        const resp = await request(app)
            .delete(`/jobs/9876`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(404);
    });
});