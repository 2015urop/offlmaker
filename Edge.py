class Edge:
    def __init__(self,species,weight,name=""):
        self.weight = weight #string giving weight function
        self.species = species
        self.id = name

    def __str__(self):
        response = '{"species":"' + self.species + '","weight":"' + self.weight + '"}'
        return response

    # ------------- GET METHODS ----------------
    def getSpecies(self):
        return self.species

    def getWeight(self):
        return self.weight

    # ------------- SET METHODS ----------------
    def setSpecies(self,species):
        self.species = species
        return self

    def setWeight(self,species):
        self.weight = weight
        return self