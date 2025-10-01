/**
 * Universal Response Requirements System
 * 
 * This system ensures all AI employees adhere to universal intelligence standards
 * and maintain consistent, high-quality responses across all interactions.
 */

import { UniversalResponse } from './universalIntelligenceFramework';
import { EmployeeIntelligenceProfile } from './employeeSpecificIntelligence';

export interface ResponseQualityMetrics {
  taskLoopCompletion: number; // 0-1
  dataReferenceAccuracy: number; // 0-1
  actionabilityScore: number; // 0-1
  collaborationScore: number; // 0-1
  personalityConsistency: number; // 0-1
  overallQuality: number; // 0-1
}

export interface ResponseValidationResult {
  isValid: boolean;
  qualityScore: number;
  issues: ResponseIssue[];
  recommendations: string[];
  strengths: string[];
}

export interface ResponseIssue {
  type: 'missing_data_reference' | 'incomplete_task_loop' | 'low_actionability' | 'personality_inconsistency' | 'collaboration_missing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
}

export class UniversalResponseRequirements {
  private static readonly MINIMUM_QUALITY_THRESHOLD = 0.8; // 80% minimum quality
  private static readonly EXCELLENCE_THRESHOLD = 0.9; // 90% for excellence

  /**
   * Validate a response against universal requirements
   */
  static validateResponse(
    response: UniversalResponse,
    employeeProfile: EmployeeIntelligenceProfile,
    userContext: any = {}
  ): ResponseValidationResult {
    const issues: ResponseIssue[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    // 1. Task Loop Completion Check
    const taskLoopScore = this.validateTaskLoop(response);
    if (taskLoopScore < 0.8) {
      issues.push({
        type: 'incomplete_task_loop',
        severity: 'high',
        description: 'Response does not complete the full task loop (process → analyze → deliver → next actions)',
        suggestion: 'Ensure response includes analysis, delivery of results, and clear next actions'
      });
    } else {
      strengths.push('Complete task loop execution');
    }

    // 2. Data Reference Accuracy Check
    const dataReferenceScore = this.validateDataReferences(response, userContext);
    if (dataReferenceScore < 0.7) {
      issues.push({
        type: 'missing_data_reference',
        severity: 'medium',
        description: 'Response lacks specific data references or uses generic observations',
        suggestion: 'Include specific user data, numbers, dates, and patterns in response'
      });
    } else {
      strengths.push('Strong data reference accuracy');
    }

    // 3. Actionability Score Check
    const actionabilityScore = this.validateActionability(response);
    if (actionabilityScore < 0.7) {
      issues.push({
        type: 'low_actionability',
        severity: 'high',
        description: 'Response lacks actionable recommendations or clear next steps',
        suggestion: 'Provide specific, actionable recommendations with clear steps'
      });
    } else {
      strengths.push('High actionability and clear recommendations');
    }

    // 4. Personality Consistency Check
    const personalityScore = this.validatePersonalityConsistency(response, employeeProfile);
    if (personalityScore < 0.8) {
      issues.push({
        type: 'personality_inconsistency',
        severity: 'medium',
        description: 'Response does not maintain consistent personality traits',
        suggestion: 'Ensure response reflects employee personality while maintaining intelligence'
      });
    } else {
      strengths.push('Consistent personality integration');
    }

    // 5. Collaboration Check
    const collaborationScore = this.validateCollaboration(response, employeeProfile);
    if (collaborationScore < 0.6) {
      issues.push({
        type: 'collaboration_missing',
        severity: 'low',
        description: 'Response does not demonstrate collaboration awareness',
        suggestion: 'Consider how other AI employees could contribute to this response'
      });
    } else {
      strengths.push('Strong collaboration awareness');
    }

    // Calculate overall quality score
    const overallQuality = (
      taskLoopScore * 0.25 +
      dataReferenceScore * 0.25 +
      actionabilityScore * 0.25 +
      personalityScore * 0.15 +
      collaborationScore * 0.10
    );

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(issues, overallQuality));

    return {
      isValid: overallQuality >= this.MINIMUM_QUALITY_THRESHOLD,
      qualityScore: overallQuality,
      issues,
      recommendations,
      strengths
    };
  }

  /**
   * Validate task loop completion
   */
  private static validateTaskLoop(response: UniversalResponse): number {
    let score = 0;
    const content = response.content.toLowerCase();

    // Check for process/analysis (25%)
    if (content.includes('analyze') || content.includes('analysis') || content.includes('i can see')) {
      score += 0.25;
    }

    // Check for delivery of results (25%)
    if (content.includes('insight') || content.includes('finding') || content.includes('result')) {
      score += 0.25;
    }

    // Check for recommendations (25%)
    if (content.includes('recommend') || content.includes('suggest') || content.includes('should')) {
      score += 0.25;
    }

    // Check for next actions (25%)
    if (response.nextActions.length > 0 || content.includes('next step') || content.includes('action')) {
      score += 0.25;
    }

    return score;
  }

  /**
   * Validate data reference accuracy
   */
  private static validateDataReferences(response: UniversalResponse, userContext: any): number {
    let score = 0;
    const content = response.content;

    // Check for specific numbers (30%)
    const numberMatches = content.match(/\$[\d,]+|\d+%|\d+\.\d+/g);
    if (numberMatches && numberMatches.length >= 2) {
      score += 0.30;
    }

    // Check for data references (30%)
    if (response.dataReferences.length > 0) {
      score += 0.30;
    }

    // Check for specific insights (20%)
    if (response.insights.length > 0) {
      score += 0.20;
    }

    // Check for confidence level (20%)
    if (response.confidence >= 0.7) {
      score += 0.20;
    }

    return score;
  }

  /**
   * Validate actionability
   */
  private static validateActionability(response: UniversalResponse): number {
    let score = 0;

    // Check for actionable recommendations (40%)
    if (response.recommendations.length > 0) {
      score += 0.40;
    }

    // Check for next actions (30%)
    if (response.nextActions.length > 0) {
      score += 0.30;
    }

    // Check for specific steps in content (30%)
    const content = response.content.toLowerCase();
    if (content.includes('step') || content.includes('action') || content.includes('do this')) {
      score += 0.30;
    }

    return score;
  }

  /**
   * Validate personality consistency
   */
  private static validatePersonalityConsistency(
    response: UniversalResponse,
    employeeProfile: EmployeeIntelligenceProfile
  ): number {
    let score = 0;
    const content = response.content.toLowerCase();
    const personalityTraits = employeeProfile.personalityIntelligence.traits;

    // Check for personality trait expression (50%)
    let traitMatches = 0;
    for (const trait of personalityTraits) {
      if (this.checkTraitExpression(content, trait)) {
        traitMatches++;
      }
    }
    score += (traitMatches / personalityTraits.length) * 0.50;

    // Check for communication style (30%)
    const communicationStyle = employeeProfile.personalityIntelligence.communicationStyle;
    if (this.checkCommunicationStyle(content, communicationStyle)) {
      score += 0.30;
    }

    // Check for motivational approach (20%)
    const motivationalApproach = employeeProfile.personalityIntelligence.motivationalApproach;
    if (this.checkMotivationalApproach(content, motivationalApproach)) {
      score += 0.20;
    }

    return score;
  }

  /**
   * Validate collaboration awareness
   */
  private static validateCollaboration(
    response: UniversalResponse,
    employeeProfile: EmployeeIntelligenceProfile
  ): number {
    let score = 0;
    const content = response.content.toLowerCase();

    // Check for collaboration mentions (40%)
    const collaborators = employeeProfile.collaborationIntelligence.primaryCollaborators;
    let collaboratorMentions = 0;
    for (const collaborator of collaborators) {
      if (content.includes(collaborator.toLowerCase())) {
        collaboratorMentions++;
      }
    }
    score += (collaboratorMentions / collaborators.length) * 0.40;

    // Check for handoff scenarios (30%)
    const handoffScenarios = employeeProfile.collaborationIntelligence.handoffScenarios;
    let handoffMentions = 0;
    for (const scenario of handoffScenarios) {
      if (content.includes(scenario.toLowerCase()) || content.includes('handoff') || content.includes('coordinate')) {
        handoffMentions++;
      }
    }
    score += (handoffMentions / handoffScenarios.length) * 0.30;

    // Check for team coordination (30%)
    if (content.includes('team') || content.includes('together') || content.includes('collaborate')) {
      score += 0.30;
    }

    return score;
  }

  /**
   * Check if content expresses a specific personality trait
   */
  private static checkTraitExpression(content: string, trait: string): boolean {
    const traitExpressions: Record<string, string[]> = {
      'organized': ['organized', 'systematic', 'structured', 'methodical'],
      'detail-oriented': ['detail', 'specific', 'precise', 'thorough'],
      'aggressive': ['aggressive', 'attack', 'strike', 'eliminate', 'destroy'],
      'tactical': ['tactical', 'strategy', 'plan', 'approach', 'method'],
      'motivational': ['motivate', 'inspire', 'encourage', 'boost', 'energize'],
      'mystical': ['mystical', 'crystal', 'spirit', 'vision', 'foresee'],
      'insightful': ['insight', 'understand', 'perceive', 'recognize', 'realize'],
      'strategic': ['strategic', 'comprehensive', 'holistic', 'overall', 'big picture'],
      'leadership': ['lead', 'coordinate', 'orchestrate', 'manage', 'direct'],
      'balanced': ['balance', 'harmony', 'equilibrium', 'stability', 'calm'],
      'realistic': ['realistic', 'practical', 'honest', 'truth', 'reality'],
      'precise': ['precise', 'accurate', 'exact', 'specific', 'detailed'],
      'efficient': ['efficient', 'streamlined', 'optimized', 'automated', 'systematic'],
      'tech-savvy': ['technology', 'digital', 'innovative', 'cutting-edge', 'advanced']
    };

    const expressions = traitExpressions[trait] || [];
    return expressions.some(expression => content.includes(expression));
  }

  /**
   * Check communication style consistency
   */
  private static checkCommunicationStyle(content: string, style: string): boolean {
    const stylePatterns: Record<string, string[]> = {
      'Clear, structured, and methodical explanations': ['clear', 'structured', 'methodical', 'step', 'process'],
      'Direct, action-oriented, and motivational': ['direct', 'action', 'motivational', 'immediately', 'now'],
      'Mystical and insightful with crystal-clear predictions': ['mystical', 'insightful', 'crystal', 'predict', 'future'],
      'Strategic, comprehensive, and wisdom-based': ['strategic', 'comprehensive', 'wisdom', 'overall', 'holistic'],
      'Executive-level, comprehensive, and authoritative': ['executive', 'comprehensive', 'authoritative', 'overview', 'coordinate'],
      'Calming, balanced, and mindfulness-focused': ['calming', 'balanced', 'mindfulness', 'peaceful', 'harmony'],
      'Direct, honest, and reality-focused': ['direct', 'honest', 'reality', 'truth', 'practical'],
      'Precise, methodical, and accuracy-focused': ['precise', 'methodical', 'accuracy', 'exact', 'detailed'],
      'Efficient, systematic, and automation-focused': ['efficient', 'systematic', 'automation', 'streamlined', 'optimized'],
      'Tech-savvy, innovative, and data-driven': ['tech', 'innovative', 'data-driven', 'digital', 'advanced']
    };

    const patterns = stylePatterns[style] || [];
    return patterns.some(pattern => content.includes(pattern));
  }

  /**
   * Check motivational approach consistency
   */
  private static checkMotivationalApproach(content: string, approach: string): boolean {
    const approachPatterns: Record<string, string[]> = {
      'Emphasizes organization and clarity as path to financial success': ['organization', 'clarity', 'success', 'path'],
      'Uses military metaphors and aggressive language to motivate debt elimination': ['military', 'aggressive', 'motivate', 'debt'],
      'Uses mystical wisdom to inspire confidence in future financial success': ['mystical', 'wisdom', 'inspire', 'confidence', 'future'],
      'Uses strategic wisdom to guide comprehensive financial success': ['strategic', 'wisdom', 'guide', 'comprehensive'],
      'Uses leadership authority to inspire comprehensive financial success': ['leadership', 'authority', 'inspire', 'comprehensive'],
      'Uses mindfulness and balance to inspire financial wellness': ['mindfulness', 'balance', 'inspire', 'wellness'],
      'Uses honest reality to motivate achievable financial success': ['honest', 'reality', 'motivate', 'achievable'],
      'Uses precision and accuracy to inspire tax optimization success': ['precision', 'accuracy', 'inspire', 'tax'],
      'Uses efficiency and automation to inspire streamlined financial success': ['efficiency', 'automation', 'inspire', 'streamlined'],
      'Uses cutting-edge technology to inspire financial innovation': ['cutting-edge', 'technology', 'inspire', 'innovation']
    };

    const patterns = approachPatterns[approach] || [];
    return patterns.some(pattern => content.includes(pattern));
  }

  /**
   * Generate recommendations based on validation results
   */
  private static generateRecommendations(issues: ResponseIssue[], overallQuality: number): string[] {
    const recommendations: string[] = [];

    if (overallQuality < this.MINIMUM_QUALITY_THRESHOLD) {
      recommendations.push('Response quality is below minimum threshold. Focus on improving core requirements.');
    }

    if (overallQuality >= this.EXCELLENCE_THRESHOLD) {
      recommendations.push('Excellent response quality! Consider sharing as a best practice example.');
    }

    // Add specific recommendations based on issues
    for (const issue of issues) {
      if (issue.severity === 'critical' || issue.severity === 'high') {
        recommendations.push(`Priority: ${issue.suggestion}`);
      }
    }

    return recommendations;
  }

  /**
   * Generate a quality report for an employee's responses
   */
  static generateQualityReport(
    employeeId: string,
    responses: UniversalResponse[],
    employeeProfile: EmployeeIntelligenceProfile
  ): QualityReport {
    const qualityMetrics: ResponseQualityMetrics[] = [];
    let totalQuality = 0;

    for (const response of responses) {
      const validation = this.validateResponse(response, employeeProfile);
      qualityMetrics.push({
        taskLoopCompletion: validation.qualityScore,
        dataReferenceAccuracy: validation.qualityScore,
        actionabilityScore: validation.qualityScore,
        collaborationScore: validation.qualityScore,
        personalityConsistency: validation.qualityScore,
        overallQuality: validation.qualityScore});
      totalQuality += validation.qualityScore;
    }

    const averageQuality = totalQuality / responses.length;
    const qualityTrend = this.calculateQualityTrend(qualityMetrics);

    return {
      employeeId,
      averageQuality,
      qualityTrend,
      totalResponses: responses.length,
      qualityDistribution: this.calculateQualityDistribution(qualityMetrics),
      improvementAreas: this.identifyImprovementAreas(qualityMetrics),
      strengths: this.identifyStrengths(qualityMetrics),
      recommendations: this.generateEmployeeRecommendations(averageQuality, qualityTrend)
    };
  }

  private static calculateQualityTrend(metrics: ResponseQualityMetrics[]): 'improving' | 'stable' | 'declining' {
    if (metrics.length < 2) return 'stable';
    
    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.overallQuality, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.overallQuality, 0) / secondHalf.length;
    
    const difference = secondHalfAvg - firstHalfAvg;
    
    if (difference > 0.05) return 'improving';
    if (difference < -0.05) return 'declining';
    return 'stable';
  }

  private static calculateQualityDistribution(metrics: ResponseQualityMetrics[]): Record<string, number> {
    const distribution = {
      'excellent': 0,
      'good': 0,
      'acceptable': 0,
      'needs_improvement': 0
    };

    for (const metric of metrics) {
      if (metric.overallQuality >= 0.9) distribution.excellent++;
      else if (metric.overallQuality >= 0.8) distribution.good++;
      else if (metric.overallQuality >= 0.7) distribution.acceptable++;
      else distribution.needs_improvement++;
    }

    return distribution;
  }

  private static identifyImprovementAreas(metrics: ResponseQualityMetrics[]): string[] {
    const areas: string[] = [];
    
    // Analyze which areas consistently score low
    const avgTaskLoop = metrics.reduce((sum, m) => sum + m.taskLoopCompletion, 0) / metrics.length;
    const avgDataRef = metrics.reduce((sum, m) => sum + m.dataReferenceAccuracy, 0) / metrics.length;
    const avgActionability = metrics.reduce((sum, m) => sum + m.actionabilityScore, 0) / metrics.length;
    const avgPersonality = metrics.reduce((sum, m) => sum + m.personalityConsistency, 0) / metrics.length;
    const avgCollaboration = metrics.reduce((sum, m) => sum + m.collaborationScore, 0) / metrics.length;

    if (avgTaskLoop < 0.8) areas.push('Task loop completion');
    if (avgDataRef < 0.8) areas.push('Data reference accuracy');
    if (avgActionability < 0.8) areas.push('Actionability and recommendations');
    if (avgPersonality < 0.8) areas.push('Personality consistency');
    if (avgCollaboration < 0.8) areas.push('Collaboration awareness');

    return areas;
  }

  private static identifyStrengths(metrics: ResponseQualityMetrics[]): string[] {
    const strengths: string[] = [];
    
    const avgTaskLoop = metrics.reduce((sum, m) => sum + m.taskLoopCompletion, 0) / metrics.length;
    const avgDataRef = metrics.reduce((sum, m) => sum + m.dataReferenceAccuracy, 0) / metrics.length;
    const avgActionability = metrics.reduce((sum, m) => sum + m.actionabilityScore, 0) / metrics.length;
    const avgPersonality = metrics.reduce((sum, m) => sum + m.personalityConsistency, 0) / metrics.length;
    const avgCollaboration = metrics.reduce((sum, m) => sum + m.collaborationScore, 0) / metrics.length;

    if (avgTaskLoop >= 0.9) strengths.push('Excellent task loop completion');
    if (avgDataRef >= 0.9) strengths.push('Strong data reference accuracy');
    if (avgActionability >= 0.9) strengths.push('High actionability and recommendations');
    if (avgPersonality >= 0.9) strengths.push('Consistent personality integration');
    if (avgCollaboration >= 0.9) strengths.push('Strong collaboration awareness');

    return strengths;
  }

  private static generateEmployeeRecommendations(
    averageQuality: number,
    trend: 'improving' | 'stable' | 'declining'
  ): string[] {
    const recommendations: string[] = [];

    if (averageQuality < 0.8) {
      recommendations.push('Focus on improving response quality to meet minimum standards');
    }

    if (trend === 'declining') {
      recommendations.push('Address declining quality trend with additional training');
    }

    if (trend === 'improving') {
      recommendations.push('Continue current improvement trajectory');
    }

    if (averageQuality >= 0.9) {
      recommendations.push('Maintain excellence and consider mentoring other employees');
    }

    return recommendations;
  }
}

export interface QualityReport {
  employeeId: string;
  averageQuality: number;
  qualityTrend: 'improving' | 'stable' | 'declining';
  totalResponses: number;
  qualityDistribution: Record<string, number>;
  improvementAreas: string[];
  strengths: string[];
  recommendations: string[];
}
