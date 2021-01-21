"use strict";

const db = require("../db");
const Job = require("./jobs.js");
const { BadRequestError, NotFoundError } = require("../expressError");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    testJobIds
} = require("./_testCommon");
const { findAll } = require( "./company" );

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** tests */

describe("create", function () {
    const newJob = {
        title: "new",
        salary: 100000,
        equity: 0.7,
        company_handle: "c1"
    }

    test("works", async function () {
        let job = await Job.create(newJob);
        expect(job).toEqual({
            id: expect.any(Number),
            title: "new",
            salary: 100000,
            equity: "0.7",
            companyHandle: "c1"
        });

        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle
            FROM jobs
            WHERE title = 'new'`
        );
        expect(result.rows).toEqual([
            {
                id: expect.any(Number),
                title: "new",
                salary: 100000,
                equity: "0.7",
                company_handle: "c1"
            }
        ])
    });
})

// Find All

describe("Find all", function() {
    test("works", async function () {
        let jobs = await Job.findAll();
        expect(jobs).toEqual([
            {
                id: expect.any(Number),
                title: "j1",
                salary: 111,
                equity: "0.1",
                companyHandle: "c1"
            },
            {
                id: expect.any(Number),
                title: "j2",
                salary: 222,
                equity: "0.2",
                companyHandle: "c2"
            },
            {
                id: expect.any(Number),
                title: "j3",
                salary: 333,
                equity: "0.3",
                companyHandle: "c3"
            },
        ]);
    });

    test("works: All filters", async function () {
        let jobs = await Job.findAll({title: "j3", minSalary: 10, hasEquity: true});
        expect(jobs).toEqual([
            {
                id: expect.any(Number),
                title: "j3",
                salary: 333,
                equity: "0.3",
                companyHandle: "c3"
            },
        ]);
    });

    test("works: title only filter", async function () {
        let jobs = await Job.findAll({title: "j1"});
        expect(jobs).toEqual([
            {
                id: expect.any(Number),
                title: "j1",
                salary: 111,
                equity: "0.1",
                companyHandle: "c1"
            },
        ])
    });

    test("works: minSalary filter only", async function () {
        let jobs = await Job.findAll({minSalary: 300});
        expect(jobs).toEqual([
            {
                id: expect.any(Number),
                title: "j3",
                salary: 333,
                equity: "0.3",
                companyHandle: "c3"
            },
        ]);
    });

    test("works: equity filter only", async function () {
        let jobs = await Job.findAll({hasEquity: true});
        expect(jobs).toEqual([
            {
                id: expect.any(Number),
                title: "j1",
                salary: 111,
                equity: "0.1",
                companyHandle: "c1"
            },
            {
                id: expect.any(Number),
                title: "j2",
                salary: 222,
                equity: "0.2",
                companyHandle: "c2"
            },
            {
                id: expect.any(Number),
                title: "j3",
                salary: 333,
                equity: "0.3",
                companyHandle: "c3"
            },
        ]);
    });
})

// Get 

describe("get", function () {
    test("works", async function () {
        let job = await Job.get(testJobIds[0]);
        expect(job).toEqual({
            id: expect.any(Number),
            title: "j1",
            salary: 111,
            equity: "0.1",
            companyHandle: "c1"
        });
    });

    test("not found if no such job", async function () {
        try {
            await Job.get(234235);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

// Update

describe("update", function () {
    const updateData = {
        title: "SWE",
        salary: 777,
        equity: "0.7",
    }

    test("works", async function () {
        let job = await Job.update(testJobIds[0], updateData);
        expect(job).toEqual({
            id: expect.any(Number),
            companyHandle: "c1",
            ...updateData,
        });

        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle
            FROM jobs
            WHERE id = $1`, [testJobIds[0]]
        );
        expect(result.rows).toEqual([{
            id: expect.any(Number),
            title: "SWE",
            salary: 777,
            equity: "0.7",
            company_handle: "c1"
        }]);
    });

    test("works: null fields", async function () {
        const updateDataSetNulls = {
            title: "SWE",
            salary: null,
            equity: null
        }

        let job = await Job.update(testJobIds[0], updateDataSetNulls);
        expect(job).toEqual({
            id: expect.any(Number),
            companyHandle: "c1",
            ...updateDataSetNulls,
        });

        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle
            FROM jobs
            WHERE id = $1`, [testJobIds[0]]
        );
        expect(result.rows).toEqual([{
            id: expect.any(Number),
            title: "SWE",
            salary: null,
            equity: null,
            company_handle: "c1"
        }]);
    });

    test("Bad request err if attempt to update id", async function () {
        try {
            await Job.update(testJobIds[0], {id: 202020, updateData});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });

    test("Bad request err if attempt to update company_handle", async function () {
        try {
            await Job.update(testJobIds[0], {company_handle: "blah", updateData});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });

    test("not found if no such job", async function () {
        try {
            await Job.update(234235, updateData);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async function () {
        try {
          await Job.update(testJobIds[0], {});
          fail();
        } catch (err) {
          expect(err instanceof BadRequestError).toBeTruthy();
        }
      });
});

// Remove

describe("remove", function() {
    test("works", async function () {
        await Job.remove(testJobIds[1]);
        const res = await db.query(
            `SELECT title from jobs WHERE id = $1`,
            [testJobIds[1]]
        );
        expect(res.rows.length).toEqual(0);
    });

    test("not found if no such company", async function () {
        try {
            await Job.remove(23412341);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
})