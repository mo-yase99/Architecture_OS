export type Skill = {
  id: string;
  name: string;
  stage: number;
  role: 'primary' | 'support' | 'future';
  status: 'not-started' | 'in-progress' | 'completed';
  prerequisites: string[];
  outcomes: string[];
  practice: string[];
};

export const learningRoadmap: Skill[] = [
  { id:'3ds-max', name:'3ds Max', stage:1, role:'primary', status:'in-progress', prerequisites:['AutoCAD'], outcomes:['Modeling','Materials','Lighting','Scene setup'], practice:['Model a complete room from drawings','Rebuild one real architectural detail in 3D','Create a small portfolio-ready scene'] },
  { id:'corona', name:'Corona Renderer', stage:2, role:'primary', status:'not-started', prerequisites:['3ds-max'], outcomes:['Lighting','Materials','Camera','Rendering'], practice:['Match a reference image','Create daylight and night setups','Render one portfolio scene'] },
  { id:'v-ray', name:'V-Ray', stage:3, role:'primary', status:'not-started', prerequisites:['3ds-max'], outcomes:['Production rendering','Materials','Lighting'], practice:['Recreate a reference render','Build a reusable material library'] },
  { id:'shop-drawing', name:'Shop Drawing', stage:4, role:'primary', status:'in-progress', prerequisites:['AutoCAD'], outcomes:['Detailing','Coordination','Execution documentation'], practice:['Detail one real project element','Produce a coordinated wall/floor detail','Review a drawing for site risks'] },
  { id:'revit-bim', name:'Revit / BIM', stage:5, role:'support', status:'not-started', prerequisites:['3ds-max','shop-drawing'], outcomes:['BIM modeling','Documentation','Coordination'], practice:['Model a small project','Create a documentation set'] },
  { id:'photoshop', name:'Photoshop', stage:6, role:'support', status:'in-progress', prerequisites:[], outcomes:['Post-production','Presentation'], practice:['Post-produce one render','Create a portfolio board'] },
  { id:'illustrator', name:'Illustrator', stage:7, role:'support', status:'in-progress', prerequisites:[], outcomes:['Brand assets','Diagrams'], practice:['Create one architectural diagram','Create one brand asset'] },
  { id:'indesign', name:'InDesign', stage:8, role:'support', status:'not-started', prerequisites:[], outcomes:['Portfolio layout','Documents'], practice:['Build one portfolio spread'] },
  { id:'premiere', name:'Premiere Pro', stage:9, role:'support', status:'not-started', prerequisites:[], outcomes:['Video editing'], practice:['Edit one 30–60 second project reel'] },
  { id:'after-effects', name:'After Effects', stage:10, role:'support', status:'not-started', prerequisites:['premiere'], outcomes:['Motion graphics'], practice:['Create one architectural motion graphic'] },
  { id:'sketchup', name:'SketchUp', stage:11, role:'future', status:'not-started', prerequisites:[], outcomes:['Fast modeling'], practice:['Model a concept quickly'] },
  { id:'blender', name:'Blender', stage:12, role:'future', status:'not-started', prerequisites:['3ds-max'], outcomes:['Alternative 3D workflow'], practice:['Recreate one simple scene'] },
  { id:'dynamo', name:'Dynamo', stage:13, role:'future', status:'not-started', prerequisites:['revit-bim'], outcomes:['BIM automation'], practice:['Automate one repetitive BIM task'] },
  { id:'ai-tools', name:'AI Tools', stage:14, role:'future', status:'not-started', prerequisites:[], outcomes:['Research','Content','Architecture workflows'], practice:['Automate one recurring task','Build one AI-assisted workflow'] },
  { id:'programming', name:'Programming', stage:15, role:'future', status:'not-started', prerequisites:[], outcomes:['Automation','MYOS development'], practice:['Build one small utility','Connect one API'] },
];

export function getEligibleSkills() {
  return learningRoadmap.filter(skill => skill.status !== 'completed' && skill.role !== 'future' || skill.id === 'revit-bim');
}
