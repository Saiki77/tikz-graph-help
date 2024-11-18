
import { Plugin, Modal, Setting } from 'obsidian';





interface FunctionParameters {
    expression: string;
    domain: string;
    showLegend: boolean;
    fill: boolean;
    tangent: boolean;
    color: string;
    dashed: boolean;
    tangentPoint: string;  
    extrema: boolean;
    thickness: string;
}

interface DynamicFunctionSetting extends TikzSetting {
    values: FunctionParameters[];
}

interface TikzSetting {
    id: string;
    name: string;
    description: string;
    category: 'basic' | 'axis' | 'function' | 'shapes' | 'grid' | 'style' | 'other';
    type: 'toggle' | 'text' | 'slider' | 'dropdown' | 'color';
    defaultValue: any;
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
    insertText: (value: any) => string;

    
    
}

class MathHelper {
    // Parse the domain string into min and max values
    static parseDomain(domain: string): [number, number] {
        const [min, max] = domain.split(':').map(Number);
        return [min, max];
    }

    static parseTangentPoint(point: string, domain: [number, number]): number {
        const x = Number(point);
        if (isNaN(x)) {
            throw new Error('Invalid tangent point');
        }
        const [min, max] = domain;
        if (x < min || x > max) {
            throw new Error('Tangent point outside domain');
        }
        return x;
    }

    // Calculate derivative of a function at a point
    static calculateDerivative(expression: string, x: number): number {
        const h = 0.0001; // Small increment for numerical derivative
   
        const f = new Function('x', `return ${expression.replace(/\^/g, '**')}`);
        return (f(x + h) - f(x)) / h;
    }

    // Find local extrema in a given range
    static findExtrema(expression: string, domain: string): { x: number, y: number, type: string }[] {
        const [min, max] = this.parseDomain(domain);
        const h = 0.0001;
        const step = (max - min) / 100; 
        const extrema: { x: number, y: number, type: string }[] = [];
        
      
        const f = new Function('x', `return ${expression.replace(/\^/g, '**')}`);
        
        // Check each point for sign changes in derivative
        for (let x = min + step; x < max - step; x += step) {
            const deriv1 = this.calculateDerivative(expression, x - step);
            const deriv2 = this.calculateDerivative(expression, x);
            const deriv3 = this.calculateDerivative(expression, x + step);
            
            // If derivative changes sign
            if ((deriv1 < 0 && deriv2 > 0) || (deriv1 > 0 && deriv2 < 0)) {
                // Calculate second derivative to determine type
                const secondDeriv = (this.calculateDerivative(expression, x + h) - 
                                   this.calculateDerivative(expression, x)) / h;
                const type = secondDeriv > 0 ? 'minimum' : 'maximum';
                extrema.push({
                    x: Number(x.toFixed(3)),
                    y: Number(f(x).toFixed(3)),
                    type
                });
            }
        }
        
        return extrema;
    }

    // Calculate tangent line equation at a point

    static calculateTangentLine(expression: string, x0: number): string {
        try {
            const f = new Function('x', `return ${expression.replace(/\^/g, '**')}`);
            const y0 = f(x0);
            const slope = this.calculateDerivative(expression, x0);
            
       
            return `${slope}*x + ${y0 - slope * x0}`;
        } catch (error) {
            console.error('Error calculating tangent line:', error);
            throw error;
        }
    }
}

interface DynamicTikzSetting extends TikzSetting {
    values?: string[]; 
}


const TIKZ_SETTINGS: TikzSetting[] = [


    // Basic Settings
    {
        id: 'dimension',
        name: '3D ',
        description: 'Wether the graph is in 2D or 3D',
        category: 'basic',
        type: 'toggle',
        defaultValue: false,
        insertText: (value) => value ? 
            '' : ''
    },

    {
        id: 'documentSetup',
        name: 'Use pgfplots',
        description: 'Wether to include pgfplots package',
        category: 'basic',
        type: 'toggle',
        defaultValue: true,
        insertText: (value) => value ? 
            '\n\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.16}\n\\begin{document}\n\\begin{tikzpicture}\n \n\\begin{axis}[' : '\n\\begin{document}\n\\begin{tikzpicture}\n ' 
    },
    {
        id: 'title',
        name: 'Title',
        description: 'Name displayed above graph',
        category: 'basic',
        type: 'text',
        defaultValue: 'My graph: \\(\\sum\\)',
        insertText: (value) => `\n  title={${value}},`
    },

    {
        id: 'size_x_cm',
        name: 'Display size width',
        description: 'The width of the final image in cm.',
        category: 'basic',
        type: 'slider',
        defaultValue: 10,
        min: 1,
        max: 20,
        step: 1,
        insertText: (value) => `\n  width={${value}cm},`
    },

    {
        id: 'size_y_cm',
        name: 'Display size hight',
        description: 'The hight of the final image in cm.',
        category: 'basic',
        type: 'slider',
        defaultValue: 10,
        min: 1,
        max: 20,
        step: 1,
        insertText: (value) => `\n  height={${value}cm},`
    },

    {
        id: 'show_axis_label',
        name: 'Show axis labels',
        description: 'Wether to show / hide labels fo axies',
        category: 'axis',
        type: 'toggle',
        defaultValue: true,
        insertText: (value) => value ? 
            '\n' : ''
    },

    {
        id: 'axis_label_x',
        name: 'X-Axis Label',
        description: 'Name displayed for x-axiswww',
        category: 'axis',
        type: 'text',
        defaultValue: 'x',
        insertText: (value) => `\n  xlabel={${value}},`
    },

    {
        id: 'axis_label_y',
        name: 'Y-Axis Label',
        description: 'Name displayed for y-axis',
        category: 'axis',
        type: 'text',
        defaultValue: 'y',
        insertText: (value) => `\n  ylabel={${value}},`
    },





    {
        id: 'documentClose',
        name: 'Document Close',
        description: 'Include document closing',
        category: 'basic',
        type: 'toggle',
        defaultValue: true,
        insertText: (value) => value ? 
            '\n\\end{axis}\n\\end{tikzpicture}\n\\end{document}' : '' // remove 
    },



    // Axis Settings
    {
        id: 'showAxis',
        name: 'Show Axes',
        description: 'Display coordinate axes',
        category: 'axis',
        type: 'toggle',
        defaultValue: true,
        insertText: (value) => value ? 
            '' : ''
    },



    // Grid Settings
    {
        id: 'showLargeGrid',
        name: 'Show large grid',
        description: 'Display large coordinate grid',
        category: 'grid',
        type: 'toggle',
        defaultValue: false,
        insertText: (value) => value ? 
            '\n   grid=major,' : '\n'
    },

    {
        id: 'showSmallGrid',
        name: 'Show small grid',
        description: 'Display small coordinate grid',
        category: 'grid',
        type: 'toggle',
        defaultValue: false,
        insertText: (value) => value ? 
            '\n grid=both,' : ''
    },
    {
        id: 'gridSize',
        name: 'Grid Size',
        description: 'Size of the grid',
        category: 'grid',
        type: 'slider',
        defaultValue: 5,
        min: 1,
        max: 10,
        step: 1,
        insertText: (value) => `\n  minor tick num=${value},`
    },



    {
        id: 'xmin',
        name: 'X-Axis Min',
        description: 'Minimum value for x-axis',
        category: 'axis',
        type: 'text',
        defaultValue: '-0.5',
        insertText: (value) => `\n  xmin=${value},`
    },
    {
        id: 'xmax',
        name: 'X-Axis Max',
        description: 'Maximum value for x-axis',
        category: 'axis',
        type: 'text',
        defaultValue: '10',
        insertText: (value) => `\n  xmax=${value},`
    },
    {
        id: 'ymin',
        name: 'Y-Axis Min',
        description: 'Minimum value for y-axis',
        category: 'axis',
        type: 'text',
        defaultValue: '-0.5',
        insertText: (value) => `\n  ymin=${value},`
    },
    {
        id: 'ymax',
        name: 'Y-Axis Max',
        description: 'Maximum value for y-axis',
        category: 'axis',
        type: 'text',
        defaultValue: '5',
        insertText: (value) => `\n  ymax=${value},`
    },

    {
        id: 'axis_allaround',
        name: 'Axis all around',
        description: 'Weather to have the axis go all around the graph',
        category: 'axis',
        type: 'toggle',
        defaultValue: true,
        insertText: (value) => value ? 
           '\n]' : ' \n  axis lines = middle,\n]' 
    },

    {
        id: 'functions',
        name: 'Functions',
        description: 'Add mathematical functions to plot',
        category: 'function',
        type: 'text',
        defaultValue: [],
        values: [],
        insertText: (values: FunctionParameters[]) => {
            return values.map(func => {
                let style = [];
                if (func.dashed) { 
                    style.push('dashed');
                }
                if (func.fill) { 
                    style.push(`\nfill=${func.color}!20,\nfill opacity=0.3`);
                }
                style.push(`${func.color}`);
                style.push(`${func.thickness}`);
                
                let code = `\n\\addplot[domain=${func.domain}, ${style.join(',')}, samples=300] {${func.expression}};`;
                if (func.showLegend) {
                    code += `\n\\addlegendentry{\\(${func.expression}\\)}`;
                }
                if (func.fill) {
                  
                }
                console.log('tangent');
                console.log(func.tangent);
                console.log('tangentpoint');
                console.log(func.tangentPoint);
                console.log('expression');
                console.log(func.expression);
                console.log('showlegend');
                console.log(func.showLegend);
                console.log('extrema');
                console.log(func.extrema);
                if (func.tangent && func.tangentPoint) {
                    try {
                        const domain = MathHelper.parseDomain(func.domain);
                        const tangentX = MathHelper.parseTangentPoint(func.tangentPoint, domain);
                        const tangentExpression = MathHelper.calculateTangentLine(func.expression, tangentX);
                        
                        // Add tangent line plot
                        code += `\n\\addplot[${func.color}, dashed, domain=${func.domain}] {${tangentExpression}};`;
                        
                        // Add point of tangency
                        const f = new Function('x', `return ${func.expression.replace(/\^/g, '**')}`);
                        code += `\n\\addplot[${func.color}, only marks] coordinates {(${tangentX},${f(tangentX)})};`;
                    } catch (error) {
                        console.error('Error calculating tangent:', error);
                    }
                }
                
                if (func.extrema) {
                    try {
                        const extremaPoints = MathHelper.findExtrema(func.expression, func.domain);
                        if (extremaPoints.length > 0) {
                            // Add extrema points
                            const coordinates = extremaPoints
                                .map(point => `(${point.x},${point.y})`)
                                .join(' ');
                            code += `\n\\addplot[${func.color}, only marks, mark=*, mark size=4pt] coordinates {${coordinates}};`;
                            
                            // Add labels for extrema
                            extremaPoints.forEach(point => {
                                console.log(point.type)
                                if(point.type=='minimum') code += `\n\\node[below] at (axis cs:${point.x},${point.y-1}) {${point.type}};`;
                                if(point.type=='maximum') code += `\n\\node[above] at (axis cs:${point.x},${point.y+1}) {${point.type}};`;
                            });
                        }
                    } catch (error) {
                        console.error('Error calculating extrema:', error);
                    }
                }
                return code;
            }).join('\n');
        }
    }
];

class SettingsManager {
    private values: Map<string, any>;

    constructor() {
        this.values = new Map();
        TIKZ_SETTINGS.forEach(setting => {
            this.values.set(setting.id, setting.defaultValue);
        });
    }

    getValue(id: string): any {
        return this.values.get(id);
    }

    setValue(id: string, value: any) {
        this.values.set(id, value);
    }

    generateTikzCode(): string {
        let code = '';
    
        // Add document setup first if enabled
        const setupSetting = TIKZ_SETTINGS.find(s => s.id === 'documentSetup');
        if (setupSetting && this.getValue('documentSetup')) {
            code += setupSetting.insertText(true);
        }
    
        // Check if the showAxis setting is true
        const showAxissetup = TIKZ_SETTINGS.find(s => s.id === 'show_axis_label');
        
    
        // Generate TikZ code based on settings
        TIKZ_SETTINGS.forEach(setting => {
            if (setting.id === 'documentSetup' || setting.id === 'documentClose') {
                return; // Skip these settings; handle them separately
            }

            
            if ((setting.id === 'gridSize' ) &&  !this.getValue('showSmallGrid')) {
                 return;
            }
            
    
            // Skip axis labels if showAxis is false
            if ((setting.id === 'axis_label_x' || setting.id === 'axis_label_y') && !this.getValue('show_axis_label')) {
                return;
            }

            
    
            // Append the insertText for other settings
            code += setting.insertText(this.getValue(setting.id));
        });
    
        // Add document close if enabled
        const closeSetting = TIKZ_SETTINGS.find(s => s.id === 'documentClose');
        if (closeSetting && this.getValue('documentClose')) {
            code += closeSetting.insertText(true);
        }
       
        
    
        return code;
    }
    
    
}

class TikzModal extends Modal {
    private tikzCode: string;
    private result: HTMLElement;
    private textArea: HTMLTextAreaElement;
    private settings: SettingsManager;

    constructor(app: any) {
        super(app);
        this.tikzCode = '';
        this.settings = new SettingsManager();
    }

    createSettingControl(setting: TikzSetting, container: HTMLElement) {

        if (setting.id === 'functions') {
            this.createFunctionControl(setting as DynamicFunctionSetting, container);
            return;
        }

            // Group x-axis range inputs
        if (setting.id === 'xmin') {
            const rangeContainer = container.createDiv('axis-range-container');
            this.createAxisRangeInputs(rangeContainer, 'x');
            return;
        }
      
        if (setting.id === 'xmax') return;

        // Group y-axis range inputs
        if (setting.id === 'ymin') {
            const rangeContainer = container.createDiv('axis-range-container');
            this.createAxisRangeInputs(rangeContainer, 'y');
            return;
        }
      
        if (setting.id === 'ymax') return;

        const settingUI = new Setting(container)
            .setName(setting.name)
            .setDesc(setting.description);

        switch (setting.type) {
            case 'toggle':
                settingUI.addToggle(toggle => {
                    toggle
                        .setValue(this.settings.getValue(setting.id))
                        .onChange(async (value) => {
                            this.settings.setValue(setting.id, value);
                        });
                });
                break;

            case 'slider':
                settingUI.addSlider(slider => {
                    slider
                        .setLimits(setting.min!, setting.max!, setting.step!)
                        .setValue(this.settings.getValue(setting.id))
                        .setDynamicTooltip()
                        .onChange(async (value) => {
                            this.settings.setValue(setting.id, value);
                        });
                });
                break;

            case 'text':
                settingUI.addText(text => {
                    text.setPlaceholder(this.settings.getValue(setting.id))
                        .setValue(this.settings.getValue(setting.id))
                        .onChange(async (value) => {
                            this.settings.setValue(setting.id, value);
                        });
                });
                break;

            case 'dropdown':
                settingUI.addDropdown(dropdown => {
                    setting.options?.forEach(option => {
                        dropdown.addOption(option, option);
                    });
                    dropdown
                        .setValue(this.settings.getValue(setting.id))
                        .onChange(async (value) => {
                            this.settings.setValue(setting.id, value);
                        });
                });
                break;
        }
    }

    onOpen() {
        const style = document.createElement("style");
        style.textContent = `
            .style-settings2-collapse-indicator > svg {
                height: 27px;
                width: 27px;
                transition: transform 0.3s ease;
                margin-right: 5px;
                margin-top: 5px;
                fill: #898f9d;
            }
            .axis-range-container {
                display: flex;
                gap: 20px;
             }
            .axis-range-container .setting-item {
                flex: 1;
              }
            .style-settings2-heading.is-collapsed .style-settings2-collapse-indicator > svg {
                transform: rotate(-90deg);
            }
            .tikz-preview-area {
                border: 1px solid var(--background-modifier-border);
                padding: 10px;
                min-height: 150px;
                margin-top: 10px;
            }
            .button-container {
                display: flex;
                gap: 50px; /* Adjust the gap between buttons */
            }
            .setting-container .setting-item-control {
                display: flex;
                gap: 100px; /* Adjust spacing between the buttons */
            }
            .collapsible-content {
                margin-top: 10px;
            }
            .setting-item textarea {
                height: 500px !important;
                width: 500px !important;
                font-family: monospace;
            }
            .tikz-code-area {
                border: 1px solid var(--background-modifier-border);
                background-color: var(--background-primary);
                padding: 10px;
                min-height: 600px;
                min-width: 600px;
                margin-top: 10px;
                font-family: monospace;
                font-size: 14px;
                overflow-y: auto;
            }
            .tikz-result {
                width: 100%;
                margin-top: 20px;
                padding: 20px;
                border: 1px solid var(--background-modifier-border);
                background-color: var(--background-primary);
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 200px;
            }
       ` ;
        document.head.appendChild(style);

        const { modalEl } = this;
        const scrollableContainer = this.createScrollableContainer();

        // Create sections
        const sections = new Map<string, HTMLElement>();
        ['basic', 'axis','function', 'grid','shapes' ].forEach(category => {
            sections.set(category, this.createCollapsibleSection(
                scrollableContainer,
                category.charAt(0).toUpperCase() + category.slice(1) + ' Settings'
            ));
        });

        // Add code section
        const codeSection = this.createCollapsibleSection(scrollableContainer, 'Code');
        sections.set('code', codeSection);

        // Create settings controls
        TIKZ_SETTINGS.forEach(setting => {
            const sectionContainer = sections.get(setting.category);
            if (sectionContainer) {
                this.createSettingControl(setting, sectionContainer);
            }
        });

        // Create code section
        this.createCodeSection(codeSection);
    }

    private createScrollableContainer() {
        const { modalEl } = this;
        const scrollableContainer = modalEl.createDiv({ cls: "scrollable-container" });
        scrollableContainer.style.maxHeight = "700px";
        scrollableContainer.style.overflowY = "auto";
        scrollableContainer.style.minWidth = "830px";
        modalEl.style.width = "870px";
        scrollableContainer.style.padding = "60px";
        return scrollableContainer;
    }

    private createCollapsibleSection(container: HTMLElement, title: string): HTMLElement {
        const header = container.createEl("div", {
            cls: "collapsible-header style-settings2-heading",
        });
        header.style.cursor = "pointer";
        header.style.padding = "10px";
        header.style.borderBottom = "1px solid var(--background-modifier-border)";
        header.style.display = "flex";
        header.style.alignItems = "center";

        const collapseIndicator = header.createDiv({
            cls: "style-settings2-collapse-indicator",
        });
        collapseIndicator.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 10l4 4 4-4z"></path></svg>`;

        header.createEl("span", { text: title });

        const content = container.createDiv({ cls: "collapsible-content" });
        content.style.padding = "0 50px";

        header.onclick = () => {
            header.classList.toggle("is-collapsed");
            if (header.classList.contains("is-collapsed")) {
                content.style.display = "none";
            } else {
                content.style.display = "block";
            }
        };

        return content;
    }

    private createAxisRangeInputs(container: HTMLElement, axis: 'x' | 'y') {
        const minSetting = new Setting(container)
            .setName(`${axis.toUpperCase()}-Axis Range`)
            .addText(text => {
                text.setPlaceholder(axis === 'x' ? '-0.5' : '-0.5')
                    .setValue(this.settings.getValue(`${axis}min`))
                    .onChange(async (value) => {
                        this.settings.setValue(`${axis}min`, value);
                    });
            });
    
        const maxSetting = new Setting(container)
            .setName('to')
            .addText(text => {
                text.setPlaceholder(axis === 'x' ? '10' : '5')
                    .setValue(this.settings.getValue(`${axis}max`))
                    .onChange(async (value) => {
                        this.settings.setValue(`${axis}max`, value);
                    });
            });
    }

    private createCodeSection(container: HTMLElement) {
        // Input area
        new Setting(container)
            .setName('TikZ Code')
            .addTextArea(text => {
                this.textArea = text.inputEl;
                text.setPlaceholder('Enter your TikZ code here')
                    .onChange(value => {
                        this.tikzCode = value;
                    });
            });

     
        const buttonSetting = new Setting(container);

        // Render button
        buttonSetting
            .addButton(btn => btn
                .setButtonText('Render')
                .onClick(() => {
                    this.renderTikz();
                }).buttonEl.style.marginRight = "50px"
            );

        // Update button
        buttonSetting.controlEl.style.padding = "10px";
        buttonSetting.addButton(btn => btn
            .setButtonText('Update')
            .onClick(() => {
                this.updateTikzCode();
             
            }));

        // Result area
        this.result = container.createDiv();
        this.result.addClass('tikz-result');
    }

    updateTikzCode() {
        const settingsCode = this.settings.generateTikzCode();
        this.tikzCode = settingsCode;
        this.textArea.value = this.tikzCode;
    }

    renderTikz() {
        this.result.empty();
        if (!this.tikzCode.trim()) {
            return;
        }

        const script = this.result.createEl("script");
        script.setAttribute("type", "text/tikz");
        script.setAttribute("data-show-console", "true");
        script.setText(this.tidyTikzSource(this.tikzCode));
    }

    tidyTikzSource(tikzSource: string) {
        // Remove non-breaking space characters
        let code = tikzSource.replaceAll("&nbsp;", "");
        // Split into lines and process
        let lines = code.split("\n");
        lines = lines.map(line => line.trim());
        lines = lines.filter(line => line);
        return lines.join("\n");
    }

    createFunctionControl = (setting: DynamicFunctionSetting, container: HTMLElement) => {
        const mainSetting = new Setting(container)
            .setName(setting.name)
            .setDesc(setting.description);
    
        const functionsContainer = container.createDiv('functions-container');
        functionsContainer.style.marginLeft = '20px';
        functionsContainer.style.marginTop = '10px';
    
       
        const rowStates = new Map();
    
        const addFunctionRow = () => {
            const rowContainer = functionsContainer.createDiv('function-row');
            const rowId = `row-${Date.now()}`; // Unique ID for this row
            
         
            rowStates.set(rowId, {
                showLegend: false,
                fill: false,
                tangent: false,
                dashed: false,
                extrema: false,
                expression: '',
                domain: '-10:10',
                color: 'black',
                thickness: 'thin',
                tangentPoint: ''
            });
    
            // Expression and Domain (first row)
            const basicContainer = rowContainer.createDiv('basic-inputs');
            basicContainer.style.display = 'flex';
            basicContainer.style.gap = '10px';
            basicContainer.style.width = '100%';
            basicContainer.style.marginBottom = '10px';
    
            // Expression input
            const expressionContainer = basicContainer.createDiv();
            expressionContainer.style.flex = '2';
            const expressionInput = new Setting(expressionContainer)
            .setName('Expression')
            .setDesc('Trigenometry must be written as sin(deg(x))')
            .addText(text => {
                text.setPlaceholder('x^2')
                    .setValue(rowStates.get(rowId).expression)
                    .onChange(value => {
                        const state = rowStates.get(rowId);
                        state.expression = value;
                        rowStates.set(rowId, state);
                        updateFunctionValues();
                    });
            });
    
            // Domain input
            const domainContainer = basicContainer.createDiv();
            domainContainer.style.flex = '2';
            const domainInput = new Setting(domainContainer)
                .setName('Domain')
                .setDesc('Be careful about extrem y values of your function')
                .addText(text => {
                    text.setPlaceholder('-10:10')
                        .setValue(rowStates.get(rowId).domain)
                        .onChange(value => {
                            const state = rowStates.get(rowId);
                            state.domain = value;
                            rowStates.set(rowId, state);
                            updateFunctionValues();
                        });
                });
    
    
            // Style options (second row)
            const styleContainer = rowContainer.createDiv('style-inputs');
            styleContainer.style.display = 'flex';
            styleContainer.style.gap = '10px';
            styleContainer.style.width = '100%';
            styleContainer.style.marginBottom = '10px';
    
            // Color dropdown
            const colorContainer = styleContainer.createDiv();
            colorContainer.style.flex = '1';
            const colorInput = new Setting(colorContainer)
                .setName('Color')
                .addDropdown(dropdown => {
                    dropdown
                        .addOptions({
                            'black': 'Black',
                            'red': 'Red',
                            'blue': 'Blue',
                            'teal': 'Teal',
                            'orange': 'Orange',
                            'green': 'Green',
                            'purple': 'Purple'
                        })
                        .setValue(rowStates.get(rowId).color)
                        .onChange(value => {
                            const state = rowStates.get(rowId);
                            state.color = value;
                            rowStates.set(rowId, state);
                            updateFunctionValues();
                        });
                });

            // Thickness dropdown
            const thicknessContainer = styleContainer.createDiv();
            thicknessContainer.style.flex = '1';
            const thicknessInput = new Setting(thicknessContainer)
                .setName('Thickness')
                .addDropdown(dropdown => {
                    dropdown
                        .addOptions({
                            'very thin': 'Very Thin',
                            'thin': 'Thin',
                            'thick': 'Thick',
                            'very thick': 'Very Thick'
                        })
                        .setValue(rowStates.get(rowId).thickness)
                        .onChange(value => {
                            const state = rowStates.get(rowId);
                            state.thickness = value;
                            rowStates.set(rowId, state);
                            updateFunctionValues();
                        });
                });

            // Toggles and dynamic inputs container (third row)
            const toggleAndInputContainer = rowContainer.createDiv('toggle-and-input-container');
            toggleAndInputContainer.style.display = 'flex';
            toggleAndInputContainer.style.gap = '20px';
            toggleAndInputContainer.style.width = '100%';

            // Toggle container
            const toggleContainer = toggleAndInputContainer.createDiv('toggle-inputs');
            toggleContainer.style.display = 'flex';
            toggleContainer.style.flexWrap = 'wrap';
            toggleContainer.style.gap = '20px';
            toggleContainer.style.width = '20%';

            // Dynamic inputs container
            const dynamicInputsContainer = toggleAndInputContainer.createDiv('dynamic-inputs');
            dynamicInputsContainer.style.display = 'flex';
            dynamicInputsContainer.style.gap = '20px';
            dynamicInputsContainer.style.flex = '1';

            let tangentPointInput: HTMLElement | null = null;

            const toggles = [
                { name: 'Legend', key: 'showLegend' },
                { name: 'Fill', key: 'fill' },
                { name: 'Tangent', key: 'tangent' },
                { name: 'Dashed', key: 'dashed' },
                { name: 'Extrema', key: 'extrema' }
            ];
        
        
        
            toggles.forEach(({ name, key }) => {
                const toggleWrapper = toggleContainer.createDiv();
                toggleWrapper.style.flex = '2';
                toggleWrapper.style.minWidth = '80px';
                const toggleSetting = new Setting(toggleWrapper)
                    .setName(name)
                    .addToggle(toggle => {
                        toggle
                            .setValue(rowStates.get(rowId)[key])
                            .onChange(value => {
                                const state = rowStates.get(rowId);
                                state[key] = value;
                                rowStates.set(rowId, state);
    
                                // Handle tangent point input visibility
                                if (key === 'tangent') {
                                    if (value) {
                                        if (!tangentPointInput) {
                                            tangentPointInput = dynamicInputsContainer.createDiv();
                                            new Setting(tangentPointInput)
                                                .setName('Tangent Point')
                                                .addText(text => {
                                                    text.setPlaceholder('x value')
                                                        .setValue(state.tangentPoint)
                                                        .onChange(value => {
                                                            state.tangentPoint = value;
                                                            rowStates.set(rowId, state);
                                                            updateFunctionValues();
                                                        });
                                                });
                                        }
                                        tangentPointInput.style.display = 'block';
                                    } else {
                                        if (tangentPointInput) {
                                            tangentPointInput.style.display = 'none';
                                        }
                                    }
                                }
                                updateFunctionValues();
                            });
                    });
            });
    
            // Remove button (separate row)
            const removeContainer = rowContainer.createDiv();
            removeContainer.style.width = '100%';
            removeContainer.style.display = 'flex';
            removeContainer.style.justifyContent = 'flex-end';
            removeContainer.style.marginTop = '10px';
            
            new Setting(removeContainer)
                .addButton(btn => 
                    btn.setIcon('trash')
                        .setTooltip('Remove function')
                        .onClick(() => {
                            rowStates.delete(rowId);
                            rowContainer.remove();
                            updateFunctionValues();
                        })
                );
    
            return {
                rowId,
                expressionInput,
                domainInput,
                colorInput,
                thicknessInput,
                toggleContainer,
                dynamicInputsContainer
            };
        };
    
        // Add initial row
        addFunctionRow();
    
        // Add button
        mainSetting.addButton(btn => 
            btn.setButtonText('Add Function')
               .onClick(() => {
                   addFunctionRow();
               })
        );
    
        const updateFunctionValues = () => {
            const functions: FunctionParameters[] = [];
            
            rowStates.forEach((state, rowId) => {
                if (state.expression && state.domain) {
                    functions.push({
                        expression: state.expression,
                        domain: state.domain,
                        color: state.color,
                        thickness: state.thickness,
                        showLegend: state.showLegend,
                        fill: state.fill,
                        tangent: state.tangent,
                        tangentPoint: state.tangent ? state.tangentPoint : '',
                        dashed: state.dashed,
                        extrema: state.extrema
                    });
                }
            });
    
            setting.values = functions;
            this.settings.setValue(setting.id, functions);
        };
    

  
    }
    }


export default class SimpleTikzPlugin extends Plugin {
   

    async onload() {

        // Add ribbon icon
        this.addRibbonIcon('square-function', 'TikZ Renderer', (evt: MouseEvent) => {
            new TikzModal(this.app).open();
        });

        // Load TikZJax when plugin loads
        this.app.workspace.onLayoutReady(() => {
            this.loadTikZJax();
        });
    }

    onunload() {
        this.unloadTikZJax();
    }

    async loadTikZJax() {
        try {
           
            const s = document.createElement("script");
            s.id = "tikzjax";
            s.type = "text/javascript";
         
            document.body.appendChild(s);
        } catch (error) {
            console.error('Failed to load TikZJax:', error);
        }
    }

    unloadTikZJax() {
        const s = document.getElementById("tikzjax");
        if (s) s.remove();
    }
}
