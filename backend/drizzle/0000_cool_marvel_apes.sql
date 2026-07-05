CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"isbn13" varchar(13),
	"isbn10" varchar(10),
	"title" text NOT NULL,
	"subtitle" text,
	"authors" text,
	"categories" text,
	"thumbnail" text,
	"description" text,
	"published_year" integer,
	"average_rating" real,
	"num_pages" integer,
	"ratings_count" integer
);
