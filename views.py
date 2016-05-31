# from __future__ import print_function
from flask import Flask, render_template, request, jsonify
import json
from offlmaker import app, db
from models import System, Tag
from OFFLmodel import OFFLmodel
from Edge import Edge
from Interaction import Interaction
from datetime import datetime
from sqlalchemy.sql import func
import os
# import sys

oString = ""
MYDIR = os.path.dirname(__file__)

def convertDictToOFFL(d):
    interactionList = []
    for interaction in d['interactionList']:
        sourceEdges = []
        targetEdges = []
        for sourceEdge in interaction['sourceEdges']:
            sourceEdges.append(Edge(sourceEdge['species'],sourceEdge['weight']))
        for targetEdge in interaction['targetEdges']:
            targetEdges.append(Edge(targetEdge['species'],targetEdge['weight']))
        interactionList.append(Interaction(interaction['interactionFunction'],sourceEdges,targetEdges))
    speciesList = d['speciesList']
    initialValues = d['initialValues']
    initialTime = d['initialTime']
    independentVar = d['independentVariable']
    endTime = d['endTime']
    return OFFLmodel(interactionList,speciesList,initialValues,initialTime,independentVar,endTime)

#helper function for solve()
def OFFLize(oString):
    OFFLdict = json.loads(oString)
    o = convertDictToOFFL(OFFLdict)

    if o.isValid():
        series = []
        sol = o.solution()
        length = o.endTime - o.initialTime
        times = [o.initialTime+x/1000. for x in range(length*1000)]

        for i in range(len(o.speciesList)):
            dataPoints = []
            for j in range(len(sol)):
                dataPoints.append([times[j],sol[j][i]])
            series.append({"name":o.speciesList[i],"data":dataPoints})
        return jsonify({'series':series})
    else:
        return jsonify({'series':[]})

@app.route("/", methods=['GET','POST'])
def index():
    if request.method=='POST': 
        # handles adding a hit to the database for the selected system
        if "selectedSystem" in request.form:
            system = System.query.get(request.form['selectedSystem'])
            system.system_hits += 1
            db.session.commit()
    return render_template('index.html')

@app.route("/solve", methods=['POST'])
def solve():
    global oString
    oString = request.data
    response = OFFLize(oString)
    return response

@app.route("/save", methods=['POST'])
def save():
    lastID = db.session.query(func.max(System.system_id)).first()[0]
    if lastID:
        system_id = str(lastID + 1)
    else:
        system_id = "1"

    system_name = request.form["system_name"]
    system_description = request.form.get("system_description")
    tags = request.form.getlist("system_tags[]")
    system_tags = []
    for tag in tags:
        temp = db.session.query(Tag).filter(Tag.tag_name==tag).first()
        if temp is None:#adds tag to database in case it doesn't exist
            temp = Tag(tag)
            db.session.add(temp)
        system_tags.append(temp)
    system_date_created = datetime.utcnow()

    # saves files to server and paths to database
    system_chart = request.form.get("system_chart") #series values of chart
    system_chart_filename = "static/systems/charts/systemChart" + system_id #create path to save on database
    chart_save_location = os.path.join(MYDIR, system_chart_filename) #create path to save to server
    with open(chart_save_location,'w') as file:
        file.write(system_chart)
    system_page = request.form.get("system_page")
    system_page_filename = "static/systems/pages/systemPage" + system_id + ".txt"
    page_save_location = os.path.join(MYDIR, system_page_filename)
    with open(page_save_location,'w') as file:
        file.write(system_page)
    system_model = request.form.get("system_model")
    system_model_filename = "static/systems/models/systemModel" + system_id
    model_save_location = os.path.join(MYDIR, system_model_filename)
    with open(model_save_location,'w') as file:
        file.write(system_model)
    
    system = System(system_name,system_description,system_tags,system_date_created,system_chart_filename,system_page_filename,system_model_filename)
    db.session.add(system)
    db.session.commit()
    return render_template('index.html')

@app.route("/preview")
def preview():
    system_id = request.args.get('system_id')
    system = System.query.get(request.args.get('system_id'))
    return jsonify(system=system.serialize())

@app.route("/download")
def download():
    o = OFFLmodel(oString)
    fileType = request.args.get('selected_index')
    if fileType=='ode':
        return jsonify({'downloadString':o.getOdeFile()})
    if request.data=='mathml':
        return jsonify({'downloadString':o.getMathML()})
    if request.data=='mathematica':
        return jsonify({'downloadString':o.getMathematicaCode()})
    if request.data=='latex':
        return jsonify({'downloadString':o.getLatex()})
    if request.data=='sql':
        return jsonify({'downloadString':o.getSqlDatabase()})   

@app.route("/ode")
def odeDownload():
    o = OFFLmodel(oString)
    return o.getOdeFile()

@app.route("/search")
def search():
    searchTag = request.args.get("searchTag")
    sortBy = request.args.get("sortBy")
    nameChecked = request.args.get("nameChecked")
    descriptionChecked = request.args.get("descriptionChecked")
    tagsChecked = request.args.get("tagsChecked")
    
    if (nameChecked or tagsChecked or descriptionChecked):
        results = System.query.filter(0==1)
        if nameChecked:
            nameResults = System.query.filter(System.system_name.contains(searchTag))
            results = results.union(nameResults)
        if descriptionChecked:
            descriptionResults = System.query.filter(System.system_description.contains(searchTag))
            results = results.union(descriptionResults)
        if tagsChecked:
            tagsResults = System.query.filter(System.tags.any(tag_name=searchTag))
            results = results.union(tagsResults)
        results = results.all()
    else:
        results = System.query.all()
    if sortBy == "relevance":
        results.sort(key=lambda x: x.relevance(searchTag),reverse=True)
    elif sortBy == "dateNewToOld":
        results.sort(key=lambda x: x.system_date_created, reverse=True)
    elif sortBy == "dateOldToNew":
       results.sort(key=lambda x: x.system_date_created)
    return jsonify(results=[result.serialize() for result in results])

if __name__ == "__main__":
    app.run(debug=True)
