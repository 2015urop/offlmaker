class Interaction:
    def __init__(self,interactionFunction, sourceEdges, targetEdges,name=""): 
        self.interactionFunction = interactionFunction #string giving interactionFunction
        self.sourceEdges = sourceEdges
        self.targetEdges = targetEdges
        self.id = name

    def __str__(self):
        response = '{"interactionFunction":"' + self.interactionFunction + '",' + '"sourceEdges":['
        first = True
        for edge in self.sourceEdges:
            if first:
                response += str(edge)
                first = False
            else:
                response += "," + str(edge)
        response += '],"targetEdges":['
        first = True
        for edge in self.targetEdges:
            if first:
                response += str(edge)
                first = False
            else:
                response += "," + str(edge)
        response += "]}"
        return response

    # ----------------- GET METHODS ----------------
    def getFunction(self):
        return self.interactionFunction

    def getSourceEdges(self):
        return self.sourceEdges

    def getTargetEdges(self):
        return self.targetEdges

    # -------------------- SET METHODS ---------------
    def setFunction(self,f):
        self.interactionFunction = f
        return self

    def setSourceEdges(self,sourceEdges):
        self.sourceEdges = sourceEdges
        return self

    def setTargetEdges(self,targetEdges):
        self.targetEdges = targetEdges
        return self

    # --------------------- ADD/REMOVE METHODS ---------------  
    def addSourceEdge(self,sourceEdge):
        self.sourceEdges.append(sourceEdge)
        return self

    def addTargetEdge(self,targetEdge):
        self.targetEdges = self.targetEdges.append(targetEdge)
        return self

    def removeEdge(self,name):
        for edge in self.sourceEdges:
            if edge.id == name:
                self.sourceEdges.remove(edge)
                return self
        for edge in self.targetEdges:
            if edge.id == name:
                self.targetEdges.remove(edge)
                return self
        return None