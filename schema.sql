PRAGMA foreign_keys = ON;

CREATE TABLE topics(
id INTEGER PRIMARY KEY AUTOINCREMENT,
username varchar,
title TEXT,
body TEXT,
timestamp DATE DEFAULT (datetime('now','localtime')),
views INTEGER,
comments INTEGER,
geolocation TEXT,
img varchar,
upvotes INTEGER,
downvotes INTEGER
);

CREATE TABLE comments(
cmt_id INTEGER PRIMARY KEY,
cmt_username varchar,
cmt_body TEXT,
cmt_timestamp DATE DEFAULT (datetime('now','localtime')),
cmt_geolocation varchar,
topics_id INTEGER,
cmt_img varchar,
FOREIGN KEY (topics_id) REFERENCES topics (id)
);




-- Test table
CREATE TABLE test(
id INTEGER PRIMARY KEY AUTOINCREMENT,
timestamp DATE DEFAULT (datetime('now','localtime')),
text TEXT
);





