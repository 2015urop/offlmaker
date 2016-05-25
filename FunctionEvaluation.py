import math

symbolDic = {
    "+":"+",
    "-":"-",
    "*":"*",
    "/":"/",
    "^":"**",
    "(":"(",
    ")":")",
    "[":"[",
    "]":"]",
    ";":"",
    " ":"",
    "":""
    }
    
functionDic = {
    "cos":"math.cos",
    "sin":"math.sin",
    "e":"math.e",
    "ceil":"math.ciel",
    "factorial":"math.factorial",
    "abs":"math.fabs",
    "floor":"math.floor",
    "exp":"math.exp",
    "ln":"math.log",
    "log":"math.log10",
    "sqrt":"math.sqrt",
    "acos":"math.acos",
    "asin":"math.asin",
    "atan":"math.atan",
    "tan":"math.tan",
    "acosh":"math.acosh",
    "asinh":"math.asinh",
    "atanh":"math.atanh",
    "cosh":"math.cosh",
    "sinh":"math.sinh",
    "tanh":"math.tanh",
    "pi":"math.pi",
    " ":"",
    "":""
    }

def toFunction(userInput,y,indepVar):
    func = ""
    current = ""
    for char in userInput+";":
        if char in symbolDic:
            if current in y: #if current is a dependent variable
                func += "y[" + str(y.index(current)) + "]" + symbolDic[char]
            elif current == indepVar: #if current is the independent variable
                func += "indepVar" + symbolDic[char]
            elif current in functionDic: #if current is a function
                func += functionDic[current] + symbolDic[char]
            elif current.replace('.','',1).isdigit(): #current is just a number
                func += current + symbolDic[char]
            elif current != "":
                #print "invalid input"
                return None
            current = "" #resets current
        else:
            current += char
    return lambda y,indepVar: eval(func)
    
#print toFunction(".05*z",["S","I","R"],"t")
#print toFunction("S*I-R**2*t",["S","I","R"],"t")
#print math.floor(3.8*9.7)