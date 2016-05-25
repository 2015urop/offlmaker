from scipy.integrate import odeint
from scipy.integrate import ode
from FunctionEvaluation import toFunction
import sympy
import matplotlib
matplotlib.use('agg')
import matplotlib.pyplot as plt
from numpy import linspace, array
import json
import pylab
import Interaction
import Edge

#class representing the diagram as a whole, with solution methods and 
#methods to convert the system to a different form
class OFFLmodel:
    def __init__(self, interactionList, speciesList=None, initialValues=None, initialTime = 0, independentVar = 't', endTime = 10):
        self.interactionList = interactionList

        if speciesList is None:
            self.speciesList = self.extractSpecies(interactionList)  
        else:
            self.speciesList = speciesList

        if initialValues is None:
            self.initialValues = [0 for i in range(0,len(self.speciesList))]
        else:
            self.initialValues = initialValues

        self.initialTime = initialTime
        self.independentVar = independentVar
        self.endTime = endTime

    # -------------------- SET METHODS ------------------- #
    def setInteractionList(self,interactionList):
        self.interactionList = interactionList
        return self

    def setInitialValues(self,initialValues):
        if len(initialValues) == len(self.initialValues):
            self.initialValues = initialValues
        else:
            pass #exception handler?
        return self

    def setInitialTime(self,initialTime):
        self.initialTime = initialTime
        return self

    def setIndependentVar(self,independentVar):
        self.independentVar = independentVar
        return self

    def setEndTime(self,endTime):
        if endTime > self.initialTime:
            self.endTime = endTime
        else:
            pass
        return self

    # -------------------- GET METHODS -------------------
    def getInteractionList(self):
        return self.interactionList

    def getInitialTime(self):
        return self.initialTime

    def getInitialValues(self):
        return self.initialValues

    def getEndTime(self):
        return self.endTime

    def getInteraction(self,name):
        for interaction in self.interactionList:
            if interaction.id == name:
                return interaction
        return None

    def getEdgesToSpecies(self,species):
        edges = []
        for interaction in self.interactionList:
            for edge in interaction.targetEdges:
                if edge.species == species:
                    edges.append(edge)
        return edges

    def getEdgesFromSpecies(self,species):
        edges = []
        for interaction in self.interactionList:
            for edge in interaction.sourceEdges:
                if edge.species == species:
                    edges.append(edge)
        return edges

    # ------------------ ADD/REMOVE METHODS --------------
    def addInteraction(self,interaction):
        self.interactionList = self.interactionList.append(interaction)
        return interaction

    def addEdge(self,edge,interactionName,edgeType):
        for interaction in self.interactionList:
            if interaction.id == interactionName:
                if edgeType == "source":
                    interaction.addSourceEdge(edge)
                if edgeType == "target":
                    interaction.addTargetEdge(edge)
                return self
        return self # should I return something to indicate that it was unsuccesful?

    def removeEdge(self,name):
        for interaction in self.interactionList:
            if interaction.removeEdge(name) is not None:
                return self
        return self

    def removeInteraction(self,name):
        for interaction in self.interactionList:
            if interaction.id == name:
                self.interactionList.remove(interaction)
                return self
        return self

    # ------------------ AUXILIARY METHODS -----------------
    def stringToFunction(self,func):
        return toFunction(func,self.speciesList,self.independentVar)

    def isValid(self):
        for interaction in self.interactionList:
            if self.stringToFunction(interaction.interactionFunction) == None:
                return False
            for edge in interaction.sourceEdges:
                if self.stringToFunction(edge.weight) == None:
                    return False
            for edge in interaction.targetEdges:
                if self.stringToFunction(edge.weight) == None:
                    return False
        return True

    @staticmethod
    def extractSpecies(interactionList):
        speciesSet = set([])
        for interaction in interactionList:
            for edge in interaction.sourceEdges:
                if edge.species not in speciesSet:
                    speciesSet.add(edge.species)
            for edge in interaction.targetEdges:
                if edge.species not in speciesSet:
                    speciesSet.add(edge.species)
        return list(speciesSet)

    def equationGenerator(self):
        """
        Generates a system of differential equations in list format,
        [ [variable',[term,term,term]] , [variable',[term,term,term]]....],
        where each term = [+/-1,edgeFunction,interactionFunction,[sourceSpecies]]
        """
        equationList = [[self.speciesList[i]] for i in range(len(self.speciesList))]        
        
        # iterate through interactions, appending a term to each target and source species
        for interaction in self.interactionList:
            sourceSpecies = [] 
            for sourceEdge in interaction.sourceEdges: # creates list of strings specifying sources for the interaction
                sourceSpecies.append(sourceEdge.species)  
            for edge in interaction.targetEdges:
                    newTerm = [1,edge.weight,interaction.interactionFunction]
                    newTerm.append(sourceSpecies)
                    equationList[self.speciesList.index(edge.species)] += [newTerm]     
            for edge in interaction.sourceEdges:
                    newTerm = [-1,edge.weight,interaction.interactionFunction]
                    newTerm.append(sourceSpecies)
                    equationList[self.speciesList.index(edge.species)] += [newTerm]
                    
        return equationList
    #end of equationGenerator function
        
    def functionGenerator(self, ODEINT = True):
        """
        Generates the set of RHS equations to be used in odeint solver, using input
        from the equation generator(system of DEs in list form)
        """
        variables = {}
        equationList = self.equationGenerator()
        
        if ODEINT:  #arguments must be in order (y,indepVar) for ODEINT method of scipy
            def f(y,indepVar):
                """
                This is the function to be used by odeint; returns value of each derivative
                given current values of the dependent variables and the independent variable
                """
                i = 0
                for species in self.speciesList: #fills a dictionary with the current values of y
                    variables[species] = y[i]
                    i += 1
                derivs = []
                for equation in equationList: #evaluates each derivative
                    RHS = equation[1:]
                    deriv = 0
                    for term in RHS:
                        #start temp = 1 or -1 based on target/source
                        temp = term[0]
                        #multiply temp by weight function
                        # if isinstance(term[1], basestring):
                        weightFunction = self.stringToFunction(term[1])
                        temp *= weightFunction(y,indepVar)
                        #multiply temp by interaction function
                        # if isinstance(term[2], basestring):
                        interactionFunction = self.stringToFunction(term[2])
                        temp *= interactionFunction(y,indepVar)
                        #multiply temp by source species
                        for x in term[3]:
                            temp *= variables[x]
                        deriv += temp
                    derivs.append(deriv)
                return derivs
                #end of f
        else: #arguments must be in order (indepVar, y) for other ODE solvers of scipy library
            def f(indepVar,y):
                i = 0
                for species in self.speciesList: #fills a dictionary with the current values of y
                    variables[species] = y[i]
                    i += 1
                derivs = []
                for equation in equationList: #evaluates each derivative
                    RHS = equation[1]
                    deriv = 0
                    #start temp = 1 or -1 based on target/source
                    temp = RHS[0]
                    #multiply temp by weight function
                    weightFunction = self.stringToFunction(RHS[1])
                    if weightFunction == None:
                        return None
                    else:
                        temp *= weightFunction(y,indepVar)
                    #multiply temp by interaction function
                    interactionFunction = self.stringToFunction(RHS[2])
                    if interactionFunction == None:
                        return None
                    else:
                        temp *= interactionFunction(y,indepVar)
                    #multiply temp by source species
                    for x in RHS[3:]:
                        temp *= variables[x]
                    deriv += temp
                    derivs.append(deriv)
                return derivs
                #end of f
        return f

     #end of functionGenerator function
        
    
    
    # ------------------------ SOLUTION METHODS --------------------
    def solution(self):
        func = self.functionGenerator()
        length = self.endTime - self.initialTime
        timesConcerned = [self.initialTime+x/1000. for x in range(length*1000)]
        return odeint(func,self.initialValues,timesConcerned)
        
    def solutionUsingDopri5(self):
        sol = []
        func = self.functionGenerator(False)
        stepSize = (self.endTime-self.initialTime)/1000.
        solver = ode(func).set_integrator('dopri5')
        solver.set_initial_value(self.initialValues,self.initialTime)
        while solver.successful() and solver.t < self.endTime:
            solver.integrate(solver.t+stepSize)
            sol.append(solver.y.tolist())
        return sol
        
    def solutionUsingDop853(self):
        sol = []
        func = self.functionGenerator(False)
        stepSize = (self.endTime-self.initialTime)/1000.
        solver = ode(func).set_integrator('dop853')
        solver.set_initial_value(self.initialValues,self.initialTime)
        while solver.successful() and solver.t < self.endTime:
            solver.integrate(solver.t+stepSize)
            sol.append(solver.y.tolist())
        return sol
        
    def solutionUsingVode(self,method='adams'):
        sol = []
        func = self.functionGenerator(False)
        stepSize = (self.endTime-self.initialTime)/1000.
        solver = ode(func).set_integrator('vode',method=method)#method defaults to adams but bdf can be used
        solver.set_initial_value(self.initialValues,self.initialTime)
        while solver.successful() and solver.t < self.endTime:
            solver.integrate(solver.t+stepSize)
            sol.append(solver.y.tolist())
        return sol

    
    def solutionUsingLSODA(self):
        sol = []
        func = self.functionGenerator(False)
        stepSize = (self.endTime-self.initialTime)/1000.
        solver = ode(func).set_integrator('lsoda')
        solver.set_initial_value(self.initialValues,self.initialTime)
        while solver.successful() and solver.t < self.endTime:
            solver.integrate(solver.t+stepSize)
            sol.append(solver.y.tolist())
        return sol
    
    # ---------------- DISPLAY METHODS -----------------------
    def __str__(self,long=False):
        response = '{"interactionList":['
        first = True
        for interaction in self.interactionList:
            if first == True:
                response += str(interaction)
                first = False
            else:
                response += "," + str(interaction)
        response += ']}'
        
        if long:
            response = response[:-1]
            response += '"speciesList":['
            first = True
            for species in self.speciesList:
                if first == True:
                    response += species
                    first = False
                else:
                    response += "," + species
            response += '],'

        return response

    def differentialEquations(self):
        rep = ""
        equations = self.equationGenerator()
        RHSequations = self.RHSequations()
            
        for i in range(len(equations)):
            rep += str(equations[i][0]) + "'="
            rep += str(RHSequations[i])
            rep += "\n"
        return rep
    
    def RHSequations(self):
        RHSequations = []
        namespace = {self.independentVar:sympy.Symbol(self.independentVar)}
        for species in self.speciesList:
            namespace[species] = sympy.Symbol(species)
            
        for equation in self.equationGenerator():
            terms = equation[1:]
            expr = 0
            for term in terms:
                termString = str(term[0]) + "*(" + term[1] + ")*(" + term[2] + ")"
                for species in term[3]:
                    termString += "*" + species
                newTerm = sympy.sympify(termString,locals = namespace)
                expr += newTerm
            RHSequations.append(expr)
        return RHSequations
    
    
    # --------------- CONVERTER METHODS ----------------------- 
    def getOdeFile(self,name = "myOFFLproject"):
        script = "#" + name + "\n"
        script += self.__str__()
        script += "done"
        return script

    def getJacobian(self):
        X = sympy.Matrix(self.RHSequations())
        symbolSpeciesList = []
        for species in self.speciesList:
            symbolSpeciesList.append(sympy.Symbol(species))
        Y = sympy.Matrix(symbolSpeciesList)
        return X.jacobian(Y)

    def getMathML(self):
        rep = ""
        speciesListLength = len(self.speciesList)
        RHSequations = self.RHSequations()

        for i in range(speciesListLength):
            rep += "<mrow>\n"
            rep += "<apply>\n\t"
            rep += "<eq/>\n\t"
            rep += "<apply>\n\t\t"
            rep += "<diff/>\n\t\t"
            rep += "<bvar><ci>"+self.independentVar+"</ci></bvar>\n\t\t"
            rep += "<ci>"+self.speciesList[i]+"</ci>\n\t\t"
            rep += "</apply>\n\t\t"
            rep += sympy.printing.mathml(RHSequations[i]) + "\n"
            rep += "</apply>\n"
            rep += "</mrow>\n\n"
        return rep
        
    def getMathematicaCode(self,plot=True):
        rep = "NDSolve[{"
        speciesListLength = len(self.speciesList)
        RHSequations = self.RHSequations()
            
        for i in range(speciesListLength):
            rep += self.speciesList[i].lower() + "'[" + self.independentVar + "]=="
            RHS = sympy.mathematica_code(RHSequations[i])
            j=0
            while j in range(len(RHS)):
                if RHS[j] in self.speciesList and (j+1 >= len(RHS) or not RHS[j+1].isalpha()):
                    RHS = RHS[:j+1].lower() + "[" + self.independentVar + "]" + RHS[j+1:]
                    #i += 3
                j += 1
            rep += RHS
            if i != speciesListLength-1:
                rep+= ","

        for i in range(speciesListLength):
            rep += ","+self.speciesList[i].lower()+"["+str(self.initialTime)+"]=="+str(self.initialValues[i])

        rep += "},{"
        for i in range(speciesListLength):
            rep += self.speciesList[i].lower() + "[" + self.independentVar + "]"
            if i != speciesListLength-1:
                rep += ","
        rep += "},{"+self.independentVar + "," + str(self.endTime)+"}]"

        if plot:
            rep += "\nPlot[Evaluate[{"
            for i in range(speciesListLength):
                rep += self.speciesList[i].lower()+"["+self.independentVar + "]"
                if i != speciesListLength-1:
                    rep += ","
            rep += "}/.First[%]],{" 
            rep += self.independentVar + "," + str(self.initialTime) + "," + str(self.endTime)
            rep += "}]"

        return rep
        
    def getLatex(self,initialValues=True):
        rep = ""
        RHSequations = self.RHSequations()
        speciesListLength = len(self.speciesList)
        for i in range(speciesListLength):
            rep += "$$\\frac{d" + self.speciesList[i] + "}{d" + self.independentVar + "} = "
            rep += sympy.latex(RHSequations[i]) + "$$\n"
        if initialValues:
            for i in range(speciesListLength):
                rep += "$$" + self.speciesList[i] + "(" + str(self.initialTime)
                rep += ") = " + str(self.initialValues[i]) + "$$\n"
        return rep
        
    def getSqlDatabase(self, name = "myOFFLproject"):
        script = "CREATE DATABASE " + name
        script += ";\nUSE " + name
        
        script += ";\n\nCREATE TABLE SPECIES\n(\n"
        script += "SPECIESINDEX int NOT NULL AUTO_INCREMENT,\n"
        script += "SPECIESNAME varchar(20),\n"
        script += "UNIQUE (SPECIESINDEX)\n);\n\n"
        
        script += "CREATE TABLE INTERACTIONS\n(\n"
        script += "INTERACTIONINDEX int NOT NULL AUTO_INCREMENT,\n"
        script += "RATEFUNCTION varchar(20) NOT NULL,\n"
        script += "UNIQUE (INTERACTIONINDEX)\n);\n\n"
        
        script += "CREATE TABLE TARGETS\n(\n"
        script += "TARGETARMINDEX int NOT NULL AUTO_INCREMENT,\n"
        script += "INTERACTIONINDEX int NOT NULL,\n"
        script += "SPECIESINDEX int NOT NULL,\n"
        script += "TARGETWEIGHT varchar(20),\n"
        script += "UNIQUE (TARGETARMINDEX,INTERACTIONINDEX),\n"
        script += "FOREIGN KEY (INTERACTIONINDEX) REFERENCES INTERACTIONS(INTERACTIONINDEX),\n"
        script += "FOREIGN KEY (SPECIESINDEX) REFERENCES SPECIES(SPECIESINDEX)\n);\n\n"
        
        script += "CREATE TABLE SOURCES\n(\n"
        script += "SOURCEARMINDEX int NOT NULL AUTO_INCREMENT,\n"
        script += "INTERACTIONINDEX int NOT NULL,\n"
        script += "SPECIESINDEX int NOT NULL,\n"
        script += "SOURCEWEIGHT varchar(20),\n"
        script += "UNIQUE (SOURCEARMINDEX,INTERACTIONINDEX),\n"
        script += "FOREIGN KEY (INTERACTIONINDEX) REFERENCES INTERACTIONS(INTERACTIONINDEX),\n"
        script += "FOREIGN KEY (SPECIESINDEX) REFERENCES SPECIES(SPECIESINDEX)\n);\n\n"
        
        for species in self.speciesList:
            script += "INSERT INTO SPECIES(SPECIESNAME)\n"
            script += "VALUES ('" + species + "');\n"
        script += "\n"
        
        i = 0
        for interaction in self.interactionList:
            i += 1
            script += "INSERT INTO INTERACTIONS(RATEFUNCTION)\n"
            script += "VALUES ('" + interaction["interactionFunction"] + "');\n"
            for targetEdge in interaction["targetEdges"]:
                script += "INSERT INTO TARGETS(INTERACTIONINDEX,SPECIESINDEX,TARGETWEIGHT)\n"
                script += "VALUES (" + str(i) + "," + str(self.speciesList.index(targetEdge["species"])+1) + ",'" + targetEdge["weight"] + "');\n"
            for sourceEdge in interaction["sourceEdges"]:
                script += "INSERT INTO SOURCES(INTERACTIONINDEX,SPECIESINDEX,SOURCEWEIGHT)\n"
                script += "VALUES (" + str(i) + "," + str(self.speciesList.index(sourceEdge["species"])+1) + ",'" + sourceEdge["weight"] + "');\n"
            script += "\n"
        
        return script
    # end of getSqlDatabase function

    def getPlot(self,xlabel=None,ylabel=None,title="myOFFLproject"):
        numSteps = (self.endTime-self.initialTime)*1000
        X = linspace(self.initialTime,self.endTime,numSteps)
        plt.figure()
        sol = self.solution()
        for i in range(len(self.speciesList)):
            Y =[]
            for point in sol:
                Y.append(point[i])
            plt.plot(X,array(Y),label=self.speciesList[i])
        if xlabel:
            plt.xlabel(xlabel)
        elif xlabel is None:
            plt.xlabel(self.independentVar)
        if ylabel:
            plt.ylabel(ylabel)
        plt.title(title)
        return plt
#end of OFFL class













# def convertDictToOFFL(d):
#     interactionList = []
#     for interaction in d['interactionList']:
#         sourceEdges = []
#         targetEdges = []
#         for sourceEdge in interaction['sourceEdges']:
#             sourceEdges.append(Edge(sourceEdge['species'],sourceEdge['weight']))
#         for targetEdge in interaction['targetEdges']:
#             targetEdges.append(Edge(targetEdge['species'],targetEdge['weight']))
#         interactionList.append(Interaction(interaction['interactionFunction'],sourceEdges,targetEdges))
#     speciesList = d['speciesList']
#     initialValues = d['initialValues']
#     initialTime = d['initialTime']
#     independentVar = d['independentVar']
#     endTime = d['endTime']
#     return OFFLmodel(interactionList,speciesList,initialValues,initialTime,independentVar,endTime)

# """CREATE OBJECT AND SET INITIAL CONDITIONS AND TIME VALUES"""
# oString = """
# {"interactionList":[{"interactionFunction":"0.05","sourceEdges":[{"weight":"1","species":"A"}],"targetEdges":[{"weight":"1","species":"B"}]},{"interactionFunction":".01*t","sourceEdges":[{"weight":"1","species":"B"}],"targetEdges":[{"weight":"1","species":"C"}]},{"interactionFunction":".04*A","sourceEdges":[{"weight":"1","species":"A"}],"targetEdges":[{"weight":"1","species":"C"}]}],"speciesList": ["A","B","C"],"initialValues":["1000","1000","1000"],"initialTime":0,"endTime":10,"independentVar":"t"}
# """
# o = convertDictToOFFL(json.loads(oString))

# print o
#----------TESTS---------------------

#TESTING SOLUTION METHODS
# sol = o.solution()
# for i in range(len(sol[0])):
#     print [point[i] for point in sol]
# print o.solutionUsingDopri5()
# print o.solutionUsingDop853()
# print o.solutionUsingVode()
# print o.solutionUsingLSODA()

# #TESTING CONVERTERS
# print o
# print o.RHSequations()
# print o.getOdeFile()
# print o.getMathML()
# print o.getMathematicaCode()
# print o.getLatex()
# print o.getLatex(True)
# print o.getSqlDatabase()
# print o.getJacobian()

# #ATTRIBUTES
# print o.interactionList
# print o.speciesList
# print o.initialValues
# print o.initialTime
# print o.endTime
# print o.independentVar


# def f(y,t):
#     [A,B,C] = y
#     f1 = -0.04*A**2 - 0.05*A
#     f2 = 0.05*A - 0.01*B*t
#     f3 = 0.04*A**2 + 0.01*B*t
#     return [f1,f2,f3]
# initialTime = 0
# endTime = 20000
# length = endTime - initialTime
# initialValues = [1000,1000,1000]
# timesConcerned = [initialTime+x/1000. for x in range(length*1000)]
# print odeint(f,initialValues,timesConcerned)

# series = []
# sol = o.solution()
# length = o.endTime - o.initialTime
# times = [o.initialTime+x/1000. for x in range(length*1000)]


# for i in range(len(o.speciesList)):
#     dataPoints = []
#     for j in range(len(sol)):
#         dataPoints.append([times[j],sol[j][i]])
#     series.append({"name":o.speciesList[i],"data":dataPoints})
# print series[0]