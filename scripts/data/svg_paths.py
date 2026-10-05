"""Explicit absolute M/L/C/Z SVG parser; rejects unsupported commands.

Cubic curves use a control-polygon length bound for <=0.5px steps; straight
segments use <=2px steps before the nonlinear geographic transformation.
"""
import math, re
import numpy as np
from shapely.geometry import Polygon, GeometryCollection
from shapely import make_valid


def svg_polygon(d):
    tokens = re.findall(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?', d)
    i=0; cmd=None; ring=[]; rings=[]; cursor=np.zeros(2)
    while i<len(tokens):
        if tokens[i].isalpha():
            cmd=tokens[i]; i+=1
            if cmd not in ('M','L','C','z','Z'):
                raise ValueError(f'Unsupported SVG command {cmd}')
            if cmd in ('z','Z'):
                if not ring: raise ValueError('Empty closed ring')
                ring.append(ring[0]); rings.append(ring); ring=[]; cmd=None
                continue
        n={'M':2,'L':2,'C':6}.get(cmd)
        if n is None or i+n>len(tokens): raise ValueError('Malformed SVG path')
        try: points=np.array(list(map(float,tokens[i:i+n]))).reshape(-1,2)
        except ValueError: raise ValueError('Malformed SVG coordinate')
        i+=n
        if cmd=='M':
            if ring: raise ValueError('Open subpath is not a polygon')
            cursor=points[0]; ring=[cursor.tolist()]; cmd='L'; continue
        if cmd=='L':
            step=max(1,math.ceil(np.linalg.norm(points[0]-cursor)/2))
            ring.extend([(cursor+(points[0]-cursor)*t).tolist() for t in np.linspace(0,1,step+1)[1:]])
        else:
            p0,p1,p2,p3=cursor,*points
            step=max(1,math.ceil(sum(np.linalg.norm(b-a) for a,b in zip((p0,p1,p2),(p1,p2,p3)))/.5))
            ring.extend([((1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t*t*p2+t**3*p3).tolist() for t in np.linspace(0,1,step+1)[1:]])
        cursor=points[-1]
    if ring: raise ValueError('Unclosed SVG path')
    result=GeometryCollection()
    for ring in rings: result=result.symmetric_difference(make_valid(Polygon(ring)))
    return result


def svg_polygon_relative(d):
    """Normalise only explicit M/L/C/Z commands, including relative forms.

    Keep the strict absolute parser unchanged for existing importers. Unsupported
    commands, open rings and malformed number groups fail rather than guessing.
    """
    tokens = re.findall(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?', d)
    i = 0
    cmd = None
    cursor = np.zeros(2)
    start = None
    output = []
    while i < len(tokens):
        if tokens[i].isalpha():
            cmd = tokens[i]
            i += 1
            if cmd not in ('M', 'm', 'L', 'l', 'C', 'c', 'z', 'Z'):
                raise ValueError(f'Unsupported SVG command {cmd}')
            if cmd.upper() == 'Z':
                if start is None:
                    raise ValueError('Empty closed ring')
                output.append('Z')
                cursor = start.copy()
                start = None
                cmd = None
                continue
        count = {'M': 2, 'L': 2, 'C': 6}.get((cmd or '').upper())
        if count is None or i + count > len(tokens):
            raise ValueError('Malformed SVG path')
        try:
            points = np.array(list(map(float, tokens[i:i+count]))).reshape(-1, 2)
        except ValueError:
            raise ValueError('Malformed SVG coordinate')
        i += count
        if cmd.islower():
            points += cursor
        upper = cmd.upper()
        if upper == 'M':
            if start is not None:
                raise ValueError('Open subpath is not a polygon')
            start = points[0].copy()
        output.append(upper + ' ' + ' '.join(str(n) for n in points.ravel()))
        cursor = points[-1].copy()
        if upper == 'M':
            cmd = 'l' if cmd == 'm' else 'L'
    return svg_polygon(' '.join(output))
