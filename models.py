from sqlalchemy.ext.hybrid import hybrid_property, hybrid_method
from flask.ext.sqlalchemy import SQLAlchemy
from datetime import datetime
from offlmaker import app
from offlmaker import db

tags = db.Table('tags',
	db.Column('tag_id', db.Integer, db.ForeignKey('tag.tag_id')),
	db.Column('system_id', db.Integer, db.ForeignKey('system.system_id')))

class System(db.Model):
	system_id = db.Column(db.Integer, primary_key=True)
	system_name = db.Column(db.String(80))
	system_description = db.Column(db.String(400))
	tags = db.relationship('Tag', secondary=tags,backref=db.backref('systems', lazy='dynamic'))
	system_date_created = db.Column(db.DateTime)
	system_chart_filename = db.Column(db.String(200))
	system_page_filename = db.Column(db.String(200))
	system_model_filename = db.Column(db.String(200))
	system_hits = db.Column(db.Integer)
	def __init__(self,system_name,system_description,tags,system_date_created,system_chart_filename,system_page_filename,system_model_filename):
		self.system_name = system_name
		self.system_description = system_description
		self.tags = tags
		self.system_date_created = system_date_created
		self.system_chart_filename = system_chart_filename
		self.system_page_filename = system_page_filename
		self.system_model_filename = system_model_filename
		self.system_hits = 0

	def serialize(self):
		return {
			'system_id': self.system_id,
			'system_name': self.system_name,
			'system_description': self.system_description,
			'system_tags': [tag.tag_name for tag in self.tags],
			'system_date_created': self.system_date_created,
			'system_chart_filename': self.system_chart_filename,
			'system_page_filename': self.system_page_filename,
			'system_model_filename': self.system_model_filename,
			'system_hits': self.system_hits
		}

	@hybrid_method
	def relevance(self,searchTag):
		wordsInName = self.system_name.split()
		wordsInDescription = self.system_description.split()
		wordsInTags = [tag.tag_name for tag in self.tags]
		nameOccurrences = 0
		descriptionOccurrences = 0
		tagOccurrences = 0
		for word in wordsInName:
			if word == searchTag:
				nameOccurrences += 1
		for word in wordsInDescription:
			if word == searchTag:
				descriptionOccurrences += 1
		for word in wordsInTags:
			if word == searchTag:
				tagOccurrences += 1
		occurrenceRating = (nameOccurrences+descriptionOccurrences*.3+tagOccurrences*2)
		return self.system_hits*occurrenceRating

class Tag(db.Model):
	tag_id = db.Column(db.Integer, primary_key=True)
	tag_name = db.Column(db.String(20))
	def __init__(self,tag_name):
		self.tag_name = tag_name
