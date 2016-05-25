from OFFLmodel import OFFLmodel, Edge, Interaction
import json

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

d = """
{"interactionList":[{"interactionFunction":"0.05","sourceEdges":[{"weight":"1","species":"A"}],"targetEdges":[{"weight":"1","species":"B"}]}],"speciesList": ["A","B"],"initialValues":["100","100"],"initialTime":0,"endTime":10,"independentVariable":"t"}"""
d = json.loads(d)
print convertDictToOFFL(d)